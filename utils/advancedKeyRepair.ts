/**
 * Outil avancé de réparation des problèmes de chiffrement
 * Résout les problèmes de clés corrompues et nettoie les données corrompues
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { doc, collection, query, where, getDocs, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid/non-secure';
import { AppLogger } from './logger';

// Constantes pour le stockage
const ENCRYPTION_KEY_STORAGE = 'GLYCOFLEX_ENCRYPTION_KEY_V2';
const LEGACY_KEYS_STORAGE = 'GLYCOFLEX_LEGACY_KEYS';
const KEY_VERSION_STORAGE = 'GLYCOFLEX_KEY_VERSION';
const CIRCUIT_BREAKER_KEY = 'corruption_circuit_breaker_v1';
const CORRUPTED_DOCS_KEY = 'corrupted_docs_v1';
const SKIPPED_UPLOAD_IDS_KEY = 'skipped_corrupted_upload_ids_v1';
const LAST_SYNC_KEY = 'last_secure_cloud_sync';
const SYNC_STATUS_KEY = 'secure_cloud_sync_enabled';

// Collections Firestore
const MEASUREMENTS_COLLECTION = 'encrypted_measurements';
const SYNC_METADATA_COLLECTION = 'sync_metadata';

// Logger
const logger = new AppLogger('KeyRepair');

/**
 * Classe pour la réparation avancée des problèmes de clés et de corruption
 */
export class AdvancedKeyRepair {
  /**
   * Réinitialise complètement les clés de chiffrement et nettoie les données corrompues
   */
  static async fullKeyReset(): Promise<{
    success: boolean;
    actions: string[];
    message: string;
  }> {
    const actions: string[] = [];
    logger.info('Début de la réinitialisation complète des clés');
    
    try {
      // 1. Sauvegarder les mesures locales en clair (non chiffrées)
      const localData = await this.backupLocalData();
      actions.push(`Sauvegarde de ${localData.length} mesures locales`);
      
      // 2. Réinitialiser le circuit breaker
      await AsyncStorage.removeItem(CIRCUIT_BREAKER_KEY);
      actions.push('Circuit breaker réinitialisé');
      
      // 3. Nettoyer les documents corrompus sur Firestore
      const cleanupResult = await this.cleanupCorruptedDocuments();
      actions.push(...cleanupResult.actions);
      
      // 4. Générer une nouvelle clé de chiffrement
      const newKey = await this.generateNewEncryptionKey();
      actions.push('Nouvelle clé de chiffrement générée');
      
      // 5. Restaurer les mesures locales avec la nouvelle clé
      await this.restoreLocalData(localData);
      actions.push(`${localData.length} mesures restaurées avec la nouvelle clé`);
      
      // 6. Réactiver la synchronisation
      await AsyncStorage.setItem(SYNC_STATUS_KEY, 'true');
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      actions.push('Synchronisation réactivée');
      
      return {
        success: true,
        actions,
        message: 'Réinitialisation complète des clés effectuée avec succès'
      };
    } catch (error) {
      logger.error('Échec de la réinitialisation des clés', { error: String(error) });
      return {
        success: false,
        actions,
        message: `Échec de la réinitialisation: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Sauvegarde les données locales en clair (non chiffrées)
   */
  private static async backupLocalData(): Promise<any[]> {
    try {
      // Récupérer les mesures stockées localement
      const storageKeys = await AsyncStorage.getAllKeys();
      const measurementKeys = storageKeys.filter(key => key.startsWith('measurement_'));
      
      if (measurementKeys.length === 0) {
        return [];
      }
      
      const measurementsData = await AsyncStorage.multiGet(measurementKeys);
      const measurements: any[] = [];
      
      for (const [key, value] of measurementsData) {
        if (value) {
          try {
            const data = JSON.parse(value);
            measurements.push(data);
          } catch (e) {
            logger.warn(`Impossible de parser la mesure ${key}`, { error: String(e) });
          }
        }
      }
      
      return measurements;
    } catch (error) {
      logger.error('Échec de la sauvegarde des données locales', { error: String(error) });
      throw error;
    }
  }
  
  /**
   * Génère une nouvelle clé de chiffrement
   */
  private static async generateNewEncryptionKey(): Promise<string> {
    try {
      // Générer une nouvelle clé aléatoire
      const array = new Uint8Array(32);
      if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(array);
      } else {
        // Fallback pour les environnements sans crypto.getRandomValues
        for (let i = 0; i < 32; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      
      // Convertir en chaîne hexadécimale
      const key = Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Sauvegarder l'ancienne clé comme legacy si elle existe
      const oldKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);
      if (oldKey) {
        const legacyKeys = await AsyncStorage.getItem(LEGACY_KEYS_STORAGE);
        const keys = legacyKeys ? JSON.parse(legacyKeys) : [];
        keys.unshift(oldKey);
        await AsyncStorage.setItem(LEGACY_KEYS_STORAGE, JSON.stringify(keys.slice(0, 5)));
      }
      
      // Incrémenter la version de clé
      const versionStr = await AsyncStorage.getItem(KEY_VERSION_STORAGE);
      const version = versionStr ? parseInt(versionStr, 10) : 0;
      await AsyncStorage.setItem(KEY_VERSION_STORAGE, (version + 1).toString());
      
      // Sauvegarder la nouvelle clé
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
      
      return key;
    } catch (error) {
      logger.error('Échec de la génération de clé de chiffrement', { error: String(error) });
      throw error;
    }
  }
  
  /**
   * Restaure les données locales avec la nouvelle clé
   */
  private static async restoreLocalData(measurements: any[]): Promise<void> {
    try {
      // Effacer d'abord les données existantes
      const storageKeys = await AsyncStorage.getAllKeys();
      const measurementKeys = storageKeys.filter(key => key.startsWith('measurement_'));
      if (measurementKeys.length > 0) {
        await AsyncStorage.multiRemove(measurementKeys);
      }
      
      // Restaurer les mesures
      for (const measurement of measurements) {
        const id = measurement.id || nanoid();
        await AsyncStorage.setItem(`measurement_${id}`, JSON.stringify({
          ...measurement,
          id
        }));
      }
    } catch (error) {
      logger.error('Échec de la restauration des données locales', { error: String(error) });
      throw error;
    }
  }
  
  /**
   * Nettoie les documents corrompus sur Firestore
   */
  private static async cleanupCorruptedDocuments(): Promise<{
    actions: string[];
    deletedCount: number;
  }> {
    const actions: string[] = [];
    let deletedCount = 0;
    
    try {
      if (!auth.currentUser) {
        throw new Error('Utilisateur non connecté');
      }
      
      const userId = auth.currentUser.uid;
      
      // 1. Récupérer les documents marqués comme corrompus
      const q = query(
        collection(db, MEASUREMENTS_COLLECTION),
        where('userId', '==', userId),
        where('isCorrupted', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const docsToDelete = querySnapshot.docs.map(doc => doc.ref);
      
      if (docsToDelete.length === 0) {
        actions.push('Aucun document corrompu trouvé');
        return { actions, deletedCount };
      }
      
      // 2. Supprimer les documents par lots
      const batchSize = 500; // Limitation Firestore
      let batchCount = 0;
      
      for (let i = 0; i < docsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = docsToDelete.slice(i, i + batchSize);
        
        currentBatch.forEach(docRef => {
          batch.delete(docRef);
        });
        
        await batch.commit();
        deletedCount += currentBatch.length;
        batchCount++;
      }
      
      actions.push(`${deletedCount} documents corrompus supprimés en ${batchCount} lots`);
      
      // 3. Nettoyer les informations locales sur les documents corrompus
      await AsyncStorage.removeItem(CORRUPTED_DOCS_KEY);
      await AsyncStorage.removeItem(SKIPPED_UPLOAD_IDS_KEY);
      actions.push('Métadonnées locales de corruption nettoyées');
      
      return { actions, deletedCount };
    } catch (error) {
      logger.error('Échec du nettoyage des documents corrompus', { error: String(error) });
      actions.push(`Erreur lors du nettoyage: ${error instanceof Error ? error.message : String(error)}`);
      return { actions, deletedCount };
    }
  }
  
  /**
   * Vérifie si la clé de chiffrement actuelle fonctionne correctement
   */
  static async testEncryptionKey(): Promise<{
    valid: boolean;
    message: string;
  }> {
    try {
      // Récupérer la clé actuelle
      const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);
      if (!key) {
        return { valid: false, message: 'Aucune clé de chiffrement trouvée' };
      }
      
      // Tester le chiffrement/déchiffrement
      const testData = { test: 'Ceci est un test', timestamp: Date.now() };
      const testString = JSON.stringify(testData);
      
      // Chiffrer avec la clé
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(testString, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convertir en format stockable
      const combinedData = iv.toString() + encrypted.toString();
      
      // Déchiffrer et vérifier
      const ivStr = combinedData.substring(0, 32);
      const encryptedData = combinedData.substring(32);
      const iv2 = CryptoJS.enc.Hex.parse(ivStr);
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        iv: iv2,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      const decryptedData = JSON.parse(decryptedString);
      
      // Vérifier que les données sont identiques
      if (decryptedData.test === testData.test && decryptedData.timestamp === testData.timestamp) {
        return { 
          valid: true, 
          message: 'Test de chiffrement réussi'
        };
      } else {
        return { 
          valid: false, 
          message: 'Le test de chiffrement a échoué - les données ne correspondent pas' 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        message: `Test de chiffrement échoué: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

// Exporter l'outil
export default AdvancedKeyRepair;
