import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { doc, setDoc, getDoc, collection, query, getDocs, where, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { GlucoseMeasurement } from './storage';
import { nanoid } from 'nanoid/non-secure';
import { SimpleCrypto } from './simpleCrypto';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';

// Note: Utilisation de SimpleCrypto pour éviter COMPLÈTEMENT les dépendances au module crypto natif

// Constantes pour le stockage
const ENCRYPTION_KEY_STORAGE = 'user_encryption_key';
const DEVICE_ID_KEY = 'secure_device_id';
const SYNC_STATUS_KEY = 'secure_cloud_sync_enabled';
const LAST_SYNC_KEY = 'last_secure_cloud_sync';
const PENDING_SYNC_OPERATIONS = 'pending_sync_operations';
const CORRUPTED_IGNORE_KEY = 'corrupted_docs_ignore_v1';
const LEGACY_KEYS_STORAGE = 'legacy_encryption_keys_v1';
const SKIPPED_UPLOAD_IDS_KEY = 'skipped_corrupted_upload_ids_v1';
const EXISTING_CLOUD_IDS_KEY = 'existing_cloud_ids_v1';

// Circuit breaker pour arrêter le cycle de corruption
const CIRCUIT_BREAKER_KEY = 'corruption_circuit_breaker_v1';
const CIRCUIT_BREAKER_RESET_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_CORRUPTION_ATTEMPTS = 5;

// Documents corrompus identifiés à ignorer complètement
const KNOWN_CORRUPTED_DOC_IDS = [
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_175469543215302ywej825',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754786109398evbrncyd0',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17550000796030c18wkn6w'
];

// Collections Firestore
const MEASUREMENTS_COLLECTION = 'encrypted_measurements';
const SYNC_METADATA_COLLECTION = 'sync_metadata';
const DEVICES_COLLECTION = 'devices';

// Types pour les opérations de synchronisation
interface PendingSyncOperation {
  type: 'add' | 'update' | 'delete';
  measurementId: string;
  data?: Omit<GlucoseMeasurement, 'id'>;
  timestamp: number;
  attempts?: number;
  nextAttempt?: number;
}

/**
 * Service d'encryption pour sécuriser les données
 */
export class EncryptionService {
  private static encryptionKey: string | null = null;
  private static keyHashCache: string | null = null;
  private static legacyKeys: string[] = [];
  
  // Initialiser la clé d'encryption utilisateur (créer ou charger)
  static async initializeEncryptionKey(): Promise<void> {
    try {
      // Essayer de récupérer la clé depuis le stockage sécurisé
      let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);

      if (!key) {
        // Migration éventuelle depuis AsyncStorage
        key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
        if (key) {
          await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
          await AsyncStorage.removeItem(ENCRYPTION_KEY_STORAGE);
        }
      }

      if (!key) {
        // Générer une nouvelle clé en utilisant SimpleCrypto
        key = SimpleCrypto.generateKey(32);
        await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
      }

      this.encryptionKey = key;
      // Pré-calculer un hash court pour instrumentation
      try {
        this.keyHashCache = CryptoJS.SHA256(key).toString().substring(0, 12);
      } catch {}

      // Charger d'éventuelles clés legacy stockées
      try {
        const legacyJson = await AsyncStorage.getItem(LEGACY_KEYS_STORAGE);
        this.legacyKeys = legacyJson ? JSON.parse(legacyJson) : [];
      } catch {
        this.legacyKeys = [];
      }

      // Tester que le chiffrement fonctionne
      const testResult = SimpleCrypto.testCrypto();
      if (testResult) {
        console.log('✅ Test de chiffrement réussi');
      } else {
        console.warn('⚠️ Test de chiffrement échoué');
      }
    } catch (error) {
      console.error("Échec de l'initialisation de la clé d'encryption:", error);
      throw new Error("Échec de l'initialisation du chiffrement");
    }
  }

  // Ajouter une clé legacy (ancienne clé potentielle pour données historiques) – debug / migration
  static async addLegacyKeyCandidate(key: string): Promise<void> {
    if (!key || key.length < 8) return;
    if (!this.legacyKeys.includes(key)) {
      this.legacyKeys.push(key);
      await AsyncStorage.setItem(LEGACY_KEYS_STORAGE, JSON.stringify(this.legacyKeys));
      console.log('➕ Clé legacy ajoutée (total =', this.legacyKeys.length, ')');
    }
  }

  // Tenter de déchiffrer avec la clé actuelle puis avec les clés legacy
  static tryDecryptWithAnyKey(rawEncrypted: string): { data: any | null; usedLegacy: boolean; legacyIndex?: number } {
    if (!this.encryptionKey) throw new Error('Clé non initialisée');
    // Retirer éventuellement le préfixe version
    let working = rawEncrypted;
    if (working.startsWith('v1|')) {
      const secondSep = working.indexOf('|', working.indexOf('|', 3) + 1);
      if (secondSep > -1) working = working.substring(secondSep + 1);
    }
    try {
      const data = SimpleCrypto.decrypt(working, this.encryptionKey);
      return { data, usedLegacy: false };
    } catch (_) {
      // Essayer les legacy
      for (let i = 0; i < this.legacyKeys.length; i++) {
        const lk = this.legacyKeys[i];
        try {
          const data = SimpleCrypto.decrypt(working, lk);
          console.log(`♻️ Déchiffrement réussi avec clé legacy #${i}`);
          return { data, usedLegacy: true, legacyIndex: i };
        } catch { /* continuer */ }
      }
  // Échec total -> signaler par exception pour que l'appelant puisse marquer une fois
  throw new Error('Aucune clé valide (courante ou legacy)');
    }
  }
  
  // Chiffrer les données avant le stockage cloud
  static encrypt(data: any): string {
    if (!this.encryptionKey) {
      throw new Error('Clé de chiffrement non initialisée');
    }
    
  // Utiliser notre service de crypto ultra-compatible
  const payload = SimpleCrypto.encrypt(data, this.encryptionKey);
  // Préfixer avec un identifiant de version + hash clé pour diagnostiquer les mismatches (format: v1|hash|cipher)
  const versioned = `v1|${this.keyHashCache || 'nohash'}|${payload}`;
  return versioned;
  }
  
  // Déchiffrer les données après récupération cloud
  static decrypt(encryptedData: string): any {
    if (!this.encryptionKey) {
      throw new Error('Clé de chiffrement non initialisée');
    }
    
    try {
      let working = encryptedData;
      let meta: { version?: string; keyHash?: string } = {};
      if (encryptedData.startsWith('v1|')) {
        const firstSep = encryptedData.indexOf('|', 3);
        const secondSep = encryptedData.indexOf('|', firstSep + 1);
        if (firstSep > -1 && secondSep > -1) {
          meta.version = encryptedData.substring(0, 2); // v1
          meta.keyHash = encryptedData.substring(firstSep + 1, secondSep);
          working = encryptedData.substring(secondSep + 1);
        }
      }
  const primaryResult = EncryptionService.tryDecryptWithAnyKey(encryptedData);
  const result = primaryResult.data;
      if (meta.keyHash && this.keyHashCache && meta.keyHash !== this.keyHashCache) {
        console.warn(`⚠️ Incohérence de clé de chiffrement détectée (hash stocké ${meta.keyHash} ≠ courant ${this.keyHashCache}). Ancienne donnée ré-enregistrée lors d'une prochaine modification.`);
      }
      return result;
    } catch (error) {
      console.error('Erreur lors du déchiffrement:', error);
      throw new Error('Échec du déchiffrement des données');
    }
  }
  
  // Exporter la clé d'encryption pour sauvegarde
  static async exportEncryptionKey(): Promise<string> {
    if (!this.encryptionKey) {
      await this.initializeEncryptionKey();
    }
    return this.encryptionKey!;
  }
  
  // Importer une clé d'encryption (lors de la restauration sur un nouvel appareil)
  static async importEncryptionKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
    await AsyncStorage.removeItem(ENCRYPTION_KEY_STORAGE);
    this.encryptionKey = key;
    try {
      this.keyHashCache = CryptoJS.SHA256(key).toString().substring(0, 12);
    } catch {}
  }

  // Rotation de la clé d'encryption - génère une nouvelle clé et archive l'ancienne
  static async rotateEncryptionKey(): Promise<void> {
    if (!this.encryptionKey) {
      await this.initializeEncryptionKey();
    }
    if (!this.encryptionKey) {
      throw new Error('Clé de chiffrement non initialisée');
    }

    const oldKey = this.encryptionKey;
    await this.addLegacyKeyCandidate(oldKey);

    const newKey = SimpleCrypto.generateKey(32);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, newKey);
    await AsyncStorage.removeItem(ENCRYPTION_KEY_STORAGE);
    this.encryptionKey = newKey;
    try {
      this.keyHashCache = CryptoJS.SHA256(newKey).toString().substring(0, 12);
    } catch {}
  }

  // Dériver une clé à partir d'une phrase de récupération (PBKDF2)
  private static deriveKeyFromPhrase(phrase: string, saltHex: string, iterations = 100000, keyLenBytes = 32): string {
    const salt = CryptoJS.enc.Hex.parse(saltHex);
    const derived = CryptoJS.PBKDF2(phrase, salt, { keySize: keyLenBytes / 4, iterations });
    return derived.toString(CryptoJS.enc.Hex); // hex string
  }

  // Sauvegarder la clé d'encryption enveloppée par la phrase (stockage cloud)
  static async backupKeyWithPhrase(phrase: string): Promise<void> {
    if (!auth.currentUser) throw new Error('Utilisateur non authentifié');
    if (!this.encryptionKey) await this.initializeEncryptionKey();

    const userId = auth.currentUser!.uid;
    const saltHex = SimpleCrypto.generateRandomBytes(16);
    const iterations = 100000;
    const derivedKeyHex = this.deriveKeyFromPhrase(phrase, saltHex, iterations);

    // Chiffrer la clé d'encryption avec la clé dérivée
    const wrappedKey = SimpleCrypto.encrypt({ key: this.encryptionKey }, derivedKeyHex);

    await setDoc(doc(db, 'user_keys', userId), {
      userId,
      wrappedKey,
      saltHex,
      kdf: { algo: 'PBKDF2', iterations, keyLen: 32 },
      updatedAt: Date.now()
    });
  }

  // Restaurer la clé à partir de la phrase
  static async restoreKeyFromPhrase(phrase: string): Promise<void> {
    if (!auth.currentUser) throw new Error('Utilisateur non authentifié');
    const userId = auth.currentUser!.uid;
    const snap = await getDoc(doc(db, 'user_keys', userId));
    if (!snap.exists()) throw new Error('Aucune clé sauvegardée');
    const data: any = snap.data();
    const saltHex = data.saltHex;
    const iterations = data.kdf?.iterations || 100000;
    const derivedKeyHex = this.deriveKeyFromPhrase(phrase, saltHex, iterations);
    const unwrapped = SimpleCrypto.decrypt(data.wrappedKey, derivedKeyHex);
    if (!unwrapped?.key || typeof unwrapped.key !== 'string') throw new Error('Déchiffrement de la clé échoué');
    await this.importEncryptionKey(unwrapped.key);
  }
}

/**
 * Circuit Breaker pour arrêter les cycles de corruption infinis
 */
export class CorruptionCircuitBreaker {
  private static async getCircuitState(): Promise<{ count: number; lastReset: number; isOpen: boolean }> {
    try {
      const stored = await AsyncStorage.getItem(CIRCUIT_BREAKER_KEY);
      if (!stored) {
        return { count: 0, lastReset: Date.now(), isOpen: false };
      }
      
      const state = JSON.parse(stored);
      const now = Date.now();
      
      // Auto-reset si assez de temps passé
      if (now - state.lastReset > CIRCUIT_BREAKER_RESET_TIME) {
        console.log('🔄 Circuit breaker reset automatique');
        return { count: 0, lastReset: now, isOpen: false };
      }
      
      return { ...state, isOpen: state.count >= MAX_CORRUPTION_ATTEMPTS };
    } catch (error) {
      console.error('❌ Erreur lecture circuit breaker:', error);
      return { count: 0, lastReset: Date.now(), isOpen: false };
    }
  }
  
  static async isOpen(): Promise<boolean> {
    const state = await this.getCircuitState();
    return state.isOpen;
  }
  
  static async recordCorruption(docId: string): Promise<boolean> {
    try {
      const state = await this.getCircuitState();
      const newCount = state.count + 1;
      const newState = {
        count: newCount,
        lastReset: state.lastReset,
        isOpen: newCount >= MAX_CORRUPTION_ATTEMPTS
      };
      
      await AsyncStorage.setItem(CIRCUIT_BREAKER_KEY, JSON.stringify(newState));
      
      if (newState.isOpen) {
        console.log(`🚨 CIRCUIT BREAKER OUVERT! ${newCount}/${MAX_CORRUPTION_ATTEMPTS} corruptions détectées. Synchronisation suspendue.`);
        return true; // Circuit ouvert
      } else {
        console.log(`⚠️ Corruption #${newCount}/${MAX_CORRUPTION_ATTEMPTS} enregistrée pour ${docId}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement corruption:', error);
      return false;
    }
  }
  
  static async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CIRCUIT_BREAKER_KEY);
      console.log('✅ Circuit breaker réinitialisé');
    } catch (error) {
      console.error('❌ Erreur reset circuit breaker:', error);
    }
  }
  
  static async getStatus(): Promise<string> {
    const state = await this.getCircuitState();
    const timeLeft = Math.max(0, CIRCUIT_BREAKER_RESET_TIME - (Date.now() - state.lastReset));
    const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
    
    if (state.isOpen) {
      return `🚨 CIRCUIT OUVERT - ${state.count}/${MAX_CORRUPTION_ATTEMPTS} corruptions. Reset auto dans ${minutesLeft}min`;
    } else {
      return `✅ Circuit fermé - ${state.count}/${MAX_CORRUPTION_ATTEMPTS} corruptions`;
    }
  }
}

/**
 * Stockage cloud sécurisé avec chiffrement end-to-end
 */
export class SecureCloudStorage {
  private static lastCloudDocIds: Set<string> = new Set();
  private static corruptedDocIds: Set<string> = new Set();
  private static ignoredCorruptedIds: Set<string> = new Set();
  private static corruptedLoaded = false;
  private static skippedUploadIds: Set<string> = new Set();
  private static skippedLoaded = false;
  private static lastSnapshotProcessAt = 0;
  private static SNAPSHOT_DEBOUNCE_MS = 2500;
  // Initialiser le chiffrement au démarrage de l'app
  static async initialize(): Promise<void> {
    await EncryptionService.initializeEncryptionKey();
  }
  
  // Obtenir l'ID utilisateur ou lever une erreur si non authentifié
  private static getUserId(): string {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }
    return userId;
  }
  
  // Sauvegarder une mesure avec chiffrement
  static async saveMeasurement(measurement: GlucoseMeasurement): Promise<GlucoseMeasurement> {
    try {
      const userId = this.getUserId();
      const deviceId = await this.getDeviceId();
      
      // 🔍 Vérifier si le document existe déjà dans le cloud
      const docId = `${userId}_${measurement.id}`;
      const existingDocRef = doc(db, MEASUREMENTS_COLLECTION, docId);
      const existingDoc = await getDoc(existingDocRef);
      
      if (existingDoc.exists()) {
        // Vérifier si le document existant est corrompu
        const existingData = existingDoc.data();
        let isCorrupted = false;
        
        if (!existingData?.encryptedData || existingData.encryptedData === 'CORRUPTED_DATA_FLAGGED') {
          isCorrupted = true;
        } else {
          try {
            // Essayer de déchiffrer le document existant
            EncryptionService.tryDecryptWithAnyKey(existingData.encryptedData);
          } catch {
            isCorrupted = true;
          }
        }
        
        if (isCorrupted) {
          console.log(`🔧 Document ${docId} corrompu détecté, écrasement forcé`);
          
          // Vérifier si c'est un document connu comme problématique
          if (KNOWN_CORRUPTED_DOC_IDS.includes(docId)) {
            console.log(`🚫 Document ${docId} dans la liste noire, suppression plutôt qu'écrasement`);
            
            // Activer le circuit breaker même pour les suppressions
            const circuitOpen = await CorruptionCircuitBreaker.recordCorruption(docId);
            if (circuitOpen) {
              console.log(`🚨 Circuit breaker ouvert après détection liste noire`);
              throw new Error('Circuit breaker activé - document dans liste noire détecté');
            }
            
            await deleteDoc(doc(db, MEASUREMENTS_COLLECTION, docId));
            throw new Error(`Document corrompu ${docId} supprimé, ré-essayez`);
          }
          
          // Enregistrer la corruption dans le circuit breaker
          const circuitOpen = await CorruptionCircuitBreaker.recordCorruption(docId);
          if (circuitOpen) {
            console.log(`🚨 Circuit breaker ouvert, arrêt de la synchronisation`);
            throw new Error('Circuit breaker activé - trop de corruptions détectées');
          }
        } else {
          console.log(`⏭️ Document ${docId} existe et est valide, éviter de l'écraser`);
          return measurement;
        }
      }
      
      // Ajouter des métadonnées d'appareil et d'horodatage
      const enhancedMeasurement = {
        ...measurement,
        syncedAt: Date.now(),
        deviceId,
        version: 1 // Pour la résolution des conflits
      };
      
      // Chiffrer les données
      const encryptedData = EncryptionService.encrypt(enhancedMeasurement);
      
      // Stocker dans Firestore avec métadonnées minimales pour recherche
      await setDoc(doc(db, MEASUREMENTS_COLLECTION, docId), {
        userId,
        measurementId: measurement.id,
        encryptedData,
        timestamp: measurement.timestamp, // Non chiffré pour les requêtes
        lastModified: Date.now()
      });
      
      console.log(`✅ Document ${docId} sauvegardé avec succès`);
      
      // Mettre à jour les métadonnées de synchronisation
      await this.updateSyncMetadata(userId, measurement.id, enhancedMeasurement.version);
      
      // Mettre à jour les informations de l'appareil
      await this.updateDeviceInfo(deviceId, userId);
      
      return measurement; // Return the saved measurement
    } catch (error) {
      console.error('Échec de la sauvegarde sécurisée:', error);
      throw error;
    }
  }
  
  // Récupérer toutes les mesures avec déchiffrement
  static async getMeasurements(): Promise<GlucoseMeasurement[]> {
    try {
      const userId = this.getUserId();
  // Réinitialiser le cache d'IDs
  SecureCloudStorage.lastCloudDocIds = new Set();
      // Charger ignore list une seule fois
      if (!this.corruptedLoaded) {
        try {
          const ignoreJson = await AsyncStorage.getItem(CORRUPTED_IGNORE_KEY);
          this.ignoredCorruptedIds = new Set(ignoreJson ? JSON.parse(ignoreJson) : []);
        } catch { this.ignoredCorruptedIds = new Set(); }
        this.corruptedLoaded = true;
      }
      if (!this.skippedLoaded) {
        try {
          const skippedJson = await AsyncStorage.getItem(SKIPPED_UPLOAD_IDS_KEY);
          this.skippedUploadIds = new Set(skippedJson ? JSON.parse(skippedJson) : []);
        } catch { this.skippedUploadIds = new Set(); }
        this.skippedLoaded = true;
      }
      
      const q = query(
        collection(db, MEASUREMENTS_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const measurements: GlucoseMeasurement[] = [];
      
      // Liste des documents problématiques connus à ignorer silencieusement
      // ⚠️ TEMPORAIREMENT VIDÉE APRÈS NETTOYAGE RADICAL
      const knownProblematicDocs: string[] = [
        // Documents supprimés par nettoyage radical - liste vidée
      ];
      
      querySnapshot.forEach(async (doc) => {
        const docId = doc.id;
        const data = doc.data();
        
        // ⭐ SEULEMENT ajouter les IDs si le document est valide et déchiffrable
        try {
          // Tentative de déchiffrement pour valider le document
          if (data?.encryptedData && data?.measurementId) {
            const decrypted = await EncryptionService.decrypt(data.encryptedData);
            if (decrypted && JSON.parse(decrypted)) {
              SecureCloudStorage.lastCloudDocIds.add(data.measurementId);
            }
          }
        } catch (error) {
          // Document corrompu - ne pas l'ajouter aux existingCloudIds
          console.warn(`🚫 Document ${docId} ignoré (corrompu)`);
          return;
        }

        // Sauter immédiatement si déjà marqué ou ignoré
        if (this.corruptedDocIds.has(docId) || this.ignoredCorruptedIds.has(docId) || data.isCorrupted === true) {
          return;
        }
        
        // Ignorer silencieusement les documents connus comme problématiques
        if (knownProblematicDocs.includes(docId) || data.isCorrupted === true) {
          return; // Ignorer ce document et passer au suivant
        }
        
        // Ignorer les documents sans données chiffrées
        if (!data.encryptedData || data.encryptedData === 'CORRUPTED_DATA_FLAGGED') {
          return; // Document sans données valides
        }
        
        // Déchiffrer les données avec gestion d'erreur améliorée
        try {
          const tryAny = EncryptionService.tryDecryptWithAnyKey(data.encryptedData);
          const decryptedData = tryAny.data;

          if (!decryptedData || typeof decryptedData !== 'object') {
            throw new Error('Format déchiffré invalide');
          }

          // Migration si clé legacy utilisée
          if (tryAny.usedLegacy) {
            try {
              await SecureCloudStorage.reencryptDocument(docId, data.measurementId, decryptedData);
              console.log(`🔁 Document migré vers clé actuelle: ${docId}`);
            } catch (migErr) {
              console.warn('⚠️ Échec migration clé legacy pour', docId, migErr);
            }
          }
          
          // Validation supplémentaire des données déchiffrées
          if (
            decryptedData.timestamp && 
            typeof decryptedData.value !== 'undefined' &&
            decryptedData.value !== null &&
            !isNaN(Number(decryptedData.value))
          ) {
            measurements.push(decryptedData as GlucoseMeasurement);
          } else {
            console.debug('Mesure déchiffrée incomplète ignorée:', docId, {
              hasTimestamp: !!decryptedData.timestamp,
              hasValue: typeof decryptedData.value !== 'undefined',
              valueType: typeof decryptedData.value
            });
          }
        } catch (decryptError) {
          // Gestion améliorée des erreurs de déchiffrement
          const errorMessage = (decryptError as Error).message;
          
          // Limiter le spam des logs - logger seulement une fois par document
          if (!this.corruptedDocIds.has(docId) && !this.ignoredCorruptedIds.has(docId)) {
            console.debug(`📄 Document ${docId} - erreur déchiffrement: ${errorMessage}`);
            
            // Marquer comme corrompu pour éviter les tentatives répétées
            this.corruptedDocIds.add(docId);
            
            // Tentative de marquage pour nettoyage futur
            try {
              if (data?.userId === userId) {
                await setDoc(doc.ref, { 
                  ...data, 
                  isCorrupted: true,
                  corruptionDetectedAt: Date.now(),
                  corruptionReason: errorMessage
                }, { merge: true });
                console.log(`🏷️ Document marqué isCorrupted: ${docId}`);
              } else {
                throw new Error('userId mismatch - unable to mark as corrupted');
              }
            } catch (markErr) {
              // Si impossible de marquer, ajouter à la ignore list persistante
              this.ignoredCorruptedIds.add(docId);
              try {
                await AsyncStorage.setItem(CORRUPTED_IGNORE_KEY, JSON.stringify(Array.from(this.ignoredCorruptedIds)));
              } catch {}
              console.warn(`🚫 Document ${docId} ajouté à la liste ignore (raison: ${(markErr as any)?.message || markErr})`);
            }
          }
        }
      });
      
      // Trier par horodatage (plus récent d'abord)
      return measurements.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Échec de la récupération sécurisée:', error);
      return [];
    }
  }

  // Exposer les IDs des mesures présentes dans le cloud (même si déchiffrement échoue)
  static getExistingCloudIds(): string[] {
    return Array.from(SecureCloudStorage.lastCloudDocIds);
  }

  // Obtenir liste des documents corrompus détectés (non persistants)
  static getCorruptedDocIds(): string[] {
    return Array.from(this.corruptedDocIds);
  }

  // Obtenir liste des documents ignorés (persistés)
  static async getIgnoredCorruptedDocIds(): Promise<string[]> {
    if (!this.corruptedLoaded) {
      try {
        const ignoreJson = await AsyncStorage.getItem(CORRUPTED_IGNORE_KEY);
        this.ignoredCorruptedIds = new Set(ignoreJson ? JSON.parse(ignoreJson) : []);
      } catch { /* ignore */ }
      this.corruptedLoaded = true;
    }
    return Array.from(this.ignoredCorruptedIds);
  }

  // Forcer un scan/migration: relit les mesures cloud et déclenche tentative de migration
  static async forceMigrationScan(): Promise<{ migrated: number; corrupted: number; ignored: number; totalCloud: number; }>{
    const beforeMigrated = 0; // we log migrations individually; could extend to count
    const cloud = await this.getMeasurements();
    // Après lecture, corruptedDocIds & ignoredCorruptedIds sont mis à jour
    return {
      migrated: beforeMigrated, // placeholder (détails déjà loggés), could compute
      corrupted: this.corruptedDocIds.size,
      ignored: this.ignoredCorruptedIds.size,
      totalCloud: cloud.length
    };
  }

  // Ré-encrypter un document avec la clé actuelle après déchiffrement legacy
  private static async reencryptDocument(fullDocId: string, measurementId: string, decrypted: any): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      // Vérifier que l'ID correspond bien au schéma userId_measurementId pour sécurité basique
      if (!fullDocId.startsWith(userId + '_')) return;
      const reenc = EncryptionService.encrypt(decrypted);
      await setDoc(doc(db, MEASUREMENTS_COLLECTION, fullDocId), {
        userId,
        measurementId,
        encryptedData: reenc,
        timestamp: decrypted.timestamp || Date.now(),
        lastModified: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('⚠️ Ré-encryption échouée pour', fullDocId, e);
    }
  }
  
  // Supprimer une mesure
  static async deleteMeasurement(measurementId: string): Promise<string> {
    try {
      const userId = this.getUserId();
      await deleteDoc(doc(db, MEASUREMENTS_COLLECTION, `${userId}_${measurementId}`));
      await this.deleteSyncMetadata(userId, measurementId);
      return measurementId;
    } catch (error) {
      console.error('Échec de la suppression sécurisée:', error);
      throw error;
    }
  }
  
  // Obtenir un identifiant unique d'appareil ou en créer un
  static async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = nanoid(16);
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  }
  
  // Mettre à jour les métadonnées de synchronisation pour la résolution des conflits
  private static async updateSyncMetadata(
    userId: string, 
    measurementId: string, 
    version: number
  ): Promise<void> {
    await setDoc(
      doc(db, SYNC_METADATA_COLLECTION, `${userId}_${measurementId}`),
      {
        userId,
        measurementId,
        version,
        lastSynced: Date.now(),
        deviceId: await this.getDeviceId()
      }
    );
  }
  
  // Supprimer les métadonnées de synchronisation
  private static async deleteSyncMetadata(
    userId: string, 
    measurementId: string
  ): Promise<void> {
    await deleteDoc(doc(db, SYNC_METADATA_COLLECTION, `${userId}_${measurementId}`));
  }
  
  // Mettre à jour les informations de l'appareil
  private static async updateDeviceInfo(deviceId: string, userId: string): Promise<void> {
    try {
      const deviceName = await this.getDeviceName();
      
      await setDoc(doc(db, DEVICES_COLLECTION, `${userId}_${deviceId}`), {
        userId,
        deviceId,
        name: deviceName,
        lastActive: Date.now(),
        platform: Platform.OS,
        version: Platform.Version
      });
    } catch (error) {
      console.error('Échec de la mise à jour des informations de l\'appareil:', error);
    }
  }
  
  // Obtenir le nom de l'appareil
  private static async getDeviceName(): Promise<string> {
    try {
      const storedName = await AsyncStorage.getItem('device_name');
      if (storedName) return storedName;
      
      return `${Platform.OS} Device`;
    } catch (error) {
      return 'Unknown Device';
    }
  }
  
  // Vérifier les conflits entre appareils
  static async checkForConflicts(): Promise<{
    hasConflicts: boolean;
    conflictCount: number;
  }> {
    try {
      const userId = this.getUserId();
      const deviceId = await this.getDeviceId();
      
      // Requête simplifiée pour éviter l'index composite
      // On récupère tous les métadonnées pour cet utilisateur
      const q = query(
        collection(db, SYNC_METADATA_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const deviceMeasurements = new Map<string, Set<string>>();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const deviceId = data.deviceId;
        const measurementId = data.measurementId;
        
        if (!deviceMeasurements.has(deviceId)) {
          deviceMeasurements.set(deviceId, new Set());
        }
        deviceMeasurements.get(deviceId)?.add(measurementId);
      });
      
      // Compter les conflits (mesures présentes sur plusieurs appareils)
      const measurementCounts = new Map<string, number>();
      
      deviceMeasurements.forEach((measurements) => {
        measurements.forEach((measurementId) => {
          measurementCounts.set(
            measurementId,
            (measurementCounts.get(measurementId) || 0) + 1
          );
        });
      });
      
      let conflictCount = 0;
      measurementCounts.forEach((count) => {
        if (count > 1) conflictCount++;
      });
      
      return {
        hasConflicts: conflictCount > 0,
        conflictCount
      };
    } catch (error) {
      console.error('Échec de la vérification des conflits:', error);
      return { hasConflicts: false, conflictCount: 0 };
    }
  }
  
  // Obtenir la liste des appareils connectés
  static async getConnectedDevices(): Promise<{
    id: string;
    name: string;
    lastActive: number;
    isCurrent: boolean;
  }[]> {
    try {
      const userId = this.getUserId();
      const currentDeviceId = await this.getDeviceId();
      
      const q = query(
        collection(db, DEVICES_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const devices: {
        id: string;
        name: string;
        lastActive: number;
        isCurrent: boolean;
      }[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        devices.push({
          id: data.deviceId,
          name: data.name || 'Appareil sans nom',
          lastActive: data.lastActive || 0,
          isCurrent: data.deviceId === currentDeviceId
        });
      });
      
      return devices;
    } catch (error) {
      console.error('Échec de la récupération des appareils:', error);
      return [];
    }
  }
  
  // Supprimer un appareil
  static async removeDevice(deviceId: string): Promise<void> {
    try {
      const userId = this.getUserId();
      await deleteDoc(doc(db, DEVICES_COLLECTION, `${userId}_${deviceId}`));
    } catch (error) {
      console.error('Échec de la suppression de l\'appareil:', error);
      throw error;
    }
  }
}

// Importation des fonctions nécessaires
import { 
  addMeasurement as addMeasurementLocal, 
  getStoredMeasurements as getStoredMeasurementsLocal,
  removeMeasurement as removeMeasurementLocal
} from './storage';

/**
 * Classe de gestion de stockage hybride améliorée avec chiffrement
 */
export class SecureHybridStorage {
  private static unsubscribeNetInfo?: () => void;
  private static unsubscribeAppState?: () => void;
  private static unsubscribeCloud?: () => void;
  private static syncInProgress = false;
  private static lastSyncTime = 0;
  private static SYNC_DEBOUNCE_MS = 5000; // 5 secondes entre les syncs
  // Initialiser le système
  static async initialize(): Promise<void> {
    console.log("🚀 Initialisation du stockage sécurisé hybride");
    
    try {
      await EncryptionService.initializeEncryptionKey();
      console.log("🔑 Clé d'encryption initialisée avec succès");
      
      // Si l'utilisateur est authentifié et la synchronisation est activée, effectuer la synchronisation
      const isEnabled = await this.isSyncEnabled();
      
      if (auth.currentUser && isEnabled) {
        console.log("👤 Utilisateur authentifié et synchronisation activée");
        // Programmer la synchronisation après une courte attente pour permettre à l'application de démarrer
        setTimeout(() => {
          console.log("⏱️ Lancement de la synchronisation automatique au démarrage");
          this.syncWithCloud().catch(e => 
            console.error("❌ Erreur lors de la synchronisation initiale:", e)
          );
        }, 1000);

        // Démarrer les abonnements et écouteurs automatiques
        await this.startAutoSyncListeners();
        await this.startRealtimeSubscription();
      } else {
        if (!auth.currentUser) {
          console.log("⚠️ Utilisateur non authentifié, synchronisation impossible");
        }
        if (!isEnabled) {
          console.log("⚠️ Synchronisation désactivée dans les paramètres");
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du stockage sécurisé:", error);
    }
  }

  // Démarrer les écouteurs de connectivité et d'état d'application
  static async startAutoSyncListeners(): Promise<void> {
    try {
      // Écoute des changements réseau
      if (!this.unsubscribeNetInfo) {
        this.unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
          if (state.isConnected) {
            // Vérifier le circuit breaker avant la sync
            const isCircuitOpen = await CorruptionCircuitBreaker.isOpen();
            if (isCircuitOpen) {
              const status = await CorruptionCircuitBreaker.getStatus();
              console.log(`🚫 Sync réseau ignorée - circuit breaker: ${status}`);
              return;
            }
            console.log('🌐 Connexion rétablie: synchronisation automatique');
            this.syncWithCloud().catch((e) => console.error('❌ Sync après reconnexion:', e));
          }
        });
      }

      // État de l'application (premier plan)
      if (!this.unsubscribeAppState) {
        const handler = async (nextState: string) => {
          if (nextState === 'active') {
            // Vérifier le circuit breaker avant la sync
            const isCircuitOpen = await CorruptionCircuitBreaker.isOpen();
            if (isCircuitOpen) {
              const status = await CorruptionCircuitBreaker.getStatus();
              console.log(`🚫 Sync foreground ignorée - circuit breaker: ${status}`);
              return;
            }
            console.log('📱 Application au premier plan: synchronisation');
            this.syncWithCloud().catch((e) => console.error('❌ Sync au retour premier plan:', e));
          }
        };
        const sub = AppState.addEventListener('change', handler);
        this.unsubscribeAppState = () => sub.remove();
      }
    } catch (error) {
      console.error('❌ Erreur startAutoSyncListeners:', error);
    }
  }

  static async stopAutoSyncListeners(): Promise<void> {
    try {
      if (this.unsubscribeNetInfo) {
        this.unsubscribeNetInfo();
        this.unsubscribeNetInfo = undefined;
      }
      if (this.unsubscribeAppState) {
        this.unsubscribeAppState();
        this.unsubscribeAppState = undefined;
      }
    } catch (error) {
      console.error('❌ Erreur stopAutoSyncListeners:', error);
    }
  }

  // Abonnement temps réel aux mesures cloud du user courant
  static async startRealtimeSubscription(): Promise<void> {
    try {
      if (this.unsubscribeCloud) return; // déjà abonné
      if (!auth.currentUser) return;
      if (!await this.isSyncEnabled()) return;

      const uid = auth.currentUser.uid;
      const q = query(collection(db, MEASUREMENTS_COLLECTION), where('userId', '==', uid));

      this.unsubscribeCloud = onSnapshot(q, async () => {
        try {
          // Vérifier le circuit breaker avant toute opération
          const isCircuitOpen = await CorruptionCircuitBreaker.isOpen();
          if (isCircuitOpen) {
            const status = await CorruptionCircuitBreaker.getStatus();
            console.log(`🚫 Listener cloud ignoré - circuit breaker: ${status}`);
            return;
          }
          
          const now = Date.now();
          if (now - (this as any).lastSnapshotProcessAt < (this as any).SNAPSHOT_DEBOUNCE_MS) {
            return; // Debounce
          }
          (this as any).lastSnapshotProcessAt = now;
          console.log('🔔 Changement détecté dans le cloud: fusion locale (debounced)');
          const cloudMeasurements = await SecureCloudStorage.getMeasurements();
          await this.mergeMeasurements(cloudMeasurements);
          await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        } catch (e) {
          console.error('❌ Erreur lors du traitement du snapshot cloud:', e);
        }
      }, (error) => {
        console.error('❌ Erreur abonnement Firestore:', error);
      });
    } catch (error) {
      console.error('❌ Erreur startRealtimeSubscription:', error);
    }
  }

  static async stopRealtimeSubscription(): Promise<void> {
    try {
      if (this.unsubscribeCloud) {
        this.unsubscribeCloud();
        this.unsubscribeCloud = undefined;
      }
    } catch (error) {
      console.error('❌ Erreur stopRealtimeSubscription:', error);
    }
  }

  // Exposer des helpers de sauvegarde/restauration de clé pour l'UI
  static async backupEncryptionKeyWithPhrase(phrase: string): Promise<void> {
    await EncryptionService.backupKeyWithPhrase(phrase);
  }

  static async restoreEncryptionKeyWithPhrase(phrase: string): Promise<void> {
    await EncryptionService.restoreKeyFromPhrase(phrase);
  }

  // Vérifier si la synchronisation cloud est activée
  static async isSyncEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  // Activer ou désactiver la synchronisation cloud
  static async setSyncEnabled(enabled: boolean): Promise<void> {
    try {
      console.log(`🔄 ${enabled ? 'Activation' : 'Désactivation'} de la synchronisation cloud`);
      await AsyncStorage.setItem(SYNC_STATUS_KEY, enabled.toString());
      
      if (enabled) {
        if (!auth.currentUser) {
          console.log("⚠️ Impossible d'activer la synchronisation: utilisateur non connecté");
          throw new Error("L'utilisateur doit être connecté pour activer la synchronisation");
        }
        
        // Synchronisation initiale forcée lors de l'activation
        console.log("🚀 Lancement de la synchronisation initiale...");
        
        // S'assurer que la clé d'encryption est initialisée
        await EncryptionService.initializeEncryptionKey();
        
        // Effectuer une synchronisation forcée
        await this.syncWithCloud();
      } else {
        console.log("🛑 Synchronisation cloud désactivée");
      }
    } catch (error) {
      console.error('❌ Échec de la mise à jour des paramètres de synchronisation:', error);
      throw error;
    }
  }

  // Ajouter une mesure avec stockage local et cloud si activé
  static async addMeasurement(
    measurement: Omit<GlucoseMeasurement, 'id'>
  ): Promise<GlucoseMeasurement> {
    // Toujours sauvegarder localement d'abord
    const savedMeasurement = await addMeasurementLocal(measurement);
    
    // Si en ligne et synchronisation activée, synchroniser immédiatement
    if (await this.isSyncEnabled() && auth.currentUser) {
      const networkState = await NetInfo.fetch();
      
      if (networkState.isConnected) {
        try {
          await SecureCloudStorage.saveMeasurement(savedMeasurement);
        } catch (error) {
          // Si la synchronisation échoue, ajouter aux opérations en attente
          await this.addPendingOperation({
            type: 'add',
            measurementId: savedMeasurement.id,
            data: measurement,
            timestamp: Date.now()
          });
        }
      } else {
        // Si hors ligne, ajouter aux opérations en attente
        await this.addPendingOperation({
          type: 'add',
          measurementId: savedMeasurement.id,
          data: measurement,
          timestamp: Date.now()
        });
      }
    }
    
    return savedMeasurement;
  }

  // Récupérer les mesures (priorité au cloud si synchronisation activée)
  static async getMeasurements(): Promise<GlucoseMeasurement[]> {
    console.log("📊 Récupération des mesures de glucose");
    
    // Si en ligne et synchronisation activée, essayer de récupérer du cloud d'abord
    if (await this.isSyncEnabled() && auth.currentUser) {
      const networkState = await NetInfo.fetch();
      
      if (networkState.isConnected) {
        try {
          console.log("🔄 Tentative de récupération des données depuis le cloud");
          // Récupérer les données cloud
          const cloudMeasurements = await SecureCloudStorage.getMeasurements();
          console.log(`☁️ ${cloudMeasurements.length} mesures récupérées depuis le cloud`);
          
          if (cloudMeasurements.length > 0) {
            // Si des données existent dans le cloud, déclencher une synchronisation complète
            // pour s'assurer que les données locales sont à jour
            setTimeout(async () => {
              // Vérifier le circuit breaker avant la sync
              const isCircuitOpen = await CorruptionCircuitBreaker.isOpen();
              if (isCircuitOpen) {
                const status = await CorruptionCircuitBreaker.getStatus();
                console.log(`🚫 Sync background ignorée - circuit breaker: ${status}`);
                return;
              }
              this.syncWithCloud().catch(e => 
                console.error("❌ Erreur lors de la synchronisation en arrière-plan:", e)
              );
            }, 100);
            
            // Retourner les données cloud immédiatement
            return cloudMeasurements;
          }
        } catch (error) {
          console.error('❌ Échec de récupération cloud, repli sur le stockage local:', error);
        }
      } else {
        console.log("📵 Pas de connexion internet, utilisation des données locales");
      }
    } else {
      console.log("🔒 Synchronisation désactivée ou utilisateur non connecté, utilisation des données locales");
    }
    
    // Repli sur stockage local
    const localMeasurements = await getStoredMeasurementsLocal();
    console.log(`💾 ${localMeasurements.length} mesures récupérées depuis le stockage local`);
    return localMeasurements;
  }

  // Supprimer une mesure
  static async deleteMeasurement(id: string): Promise<string> {
    // Toujours supprimer localement d'abord
    await removeMeasurementLocal(id);
    
    // Si en ligne et synchronisation activée, synchroniser immédiatement
    if (await this.isSyncEnabled() && auth.currentUser) {
      const networkState = await NetInfo.fetch();
      
      if (networkState.isConnected) {
        try {
          await SecureCloudStorage.deleteMeasurement(id);
        } catch (error) {
          // Si la synchronisation échoue, ajouter aux opérations en attente
          await this.addPendingOperation({
            type: 'delete',
            measurementId: id,
            timestamp: Date.now()
          });
        }
      } else {
        // Si hors ligne, ajouter aux opérations en attente
        await this.addPendingOperation({
          type: 'delete',
          measurementId: id,
          timestamp: Date.now()
        });
      }
    }
    
    return id;
  }

  // Ajouter une opération en attente pour la prochaine synchronisation
  private static async addPendingOperation(operation: PendingSyncOperation): Promise<void> {
    try {
      // Récupérer les opérations en attente existantes
      const pendingOpsJson = await AsyncStorage.getItem(PENDING_SYNC_OPERATIONS);
      const pendingOps: PendingSyncOperation[] = pendingOpsJson 
        ? JSON.parse(pendingOpsJson) 
        : [];
      
      // Ajouter la nouvelle opération
      pendingOps.push({ ...operation, attempts: 0, nextAttempt: Date.now() });
      
      // Limiter la taille de la file d'attente
      const MAX_QUEUE = 500;
      while (pendingOps.length > MAX_QUEUE) {
        pendingOps.shift();
      }
      
      // Stocker les opérations mises à jour
      await AsyncStorage.setItem(PENDING_SYNC_OPERATIONS, JSON.stringify(pendingOps));
    } catch (error) {
      console.error('Échec de l\'ajout d\'opération en attente:', error);
    }
  }

  // Fusionner les mesures cloud avec le stockage local
  private static async mergeMeasurements(cloudMeasurements: GlucoseMeasurement[]): Promise<void> {
    try {
      // Vérifier le circuit breaker avant toute opération
      const isCircuitOpen = await CorruptionCircuitBreaker.isOpen();
      if (isCircuitOpen) {
        const status = await CorruptionCircuitBreaker.getStatus();
        console.log(`🚫 Fusion bloquée par circuit breaker: ${status}`);
        throw new Error('Circuit breaker activé - fusion suspendue');
      }
      
      const userId = auth.currentUser?.uid || 'unknown'; // Obtenir l'ID utilisateur pour les documents corrompus
      
      // Récupérer les mesures locales
      const localMeasurements = await getStoredMeasurementsLocal();
      console.log(`📊 Mesures locales: ${localMeasurements.length}, Mesures cloud: ${cloudMeasurements.length}`);
      console.log(`📱 IDs mesures locales: [${localMeasurements.map(m => m.id).join(', ')}]`);
      console.log(`☁️ IDs mesures cloud: [${cloudMeasurements.map(m => m.id).join(', ')}]`);
      
      // Créer une map des mesures locales pour une recherche efficace
      const localMeasureMap = new Map<string, GlucoseMeasurement>();
      localMeasurements.forEach(m => localMeasureMap.set(m.id, m));
      
      // Créer une map des mesures cloud pour une recherche efficace
      const cloudMeasureMap = new Map<string, GlucoseMeasurement>();
      cloudMeasurements.forEach(m => cloudMeasureMap.set(m.id, m));
      
      // Mesures à ajouter localement (présentes dans le cloud mais pas localement)
      const measuresToAdd: GlucoseMeasurement[] = [];
      cloudMeasurements.forEach(measurement => {
        if (!localMeasureMap.has(measurement.id)) {
          measuresToAdd.push(measurement);
        }
      });
      
      console.log(`➕ Ajout de ${measuresToAdd.length} nouvelles mesures depuis le cloud`);
      
      // Mesures à envoyer au cloud (présentes localement mais pas dans le cloud)
      const measuresToUpload: GlucoseMeasurement[] = [];
      for (const measurement of localMeasurements) {
        if (!cloudMeasureMap.has(measurement.id)) {
          // Vérifier si cette mesure existe déjà dans le cloud mais a échoué au déchiffrement
          const existingCloudIds = SecureCloudStorage.getExistingCloudIds();
          console.log(`🔍 Vérification mesure ${measurement.id}: existingCloudIds = [${existingCloudIds.join(', ')}]`);
          
          if (existingCloudIds.includes(measurement.id)) {
            // Vérifier si c'est dans la liste des uploads ignorés pour éviter la boucle
            if ((SecureCloudStorage as any).skippedUploadIds?.has(measurement.id)) {
              console.warn(`⏭️ Mesure ${measurement.id} dans la liste des uploads ignorés`);
              return;
            }
            
            // Nouvelle logique: essayer de re-uploader si la mesure locale est plus récente
            // ou si c'est une tentative de récupération après correction
            console.warn(`⚠️ Mesure ${measurement.id} existe dans le cloud mais non déchiffrable`);
            
            // Vérifier si c'est un document connu comme problématique
            const docId = `${userId}_${measurement.id}`;
            if (KNOWN_CORRUPTED_DOC_IDS.includes(docId)) {
              console.log(`🚫 Document ${docId} dans la liste noire, ignorer complètement`);
              return; // Ignorer cette mesure
            }
            
            // Enregistrer la corruption dans le circuit breaker
            const circuitOpen = await CorruptionCircuitBreaker.recordCorruption(docId);
            if (circuitOpen) {
              console.log(`🚨 Circuit breaker ouvert, arrêt de l'upload`);
              return; // Arrêter l'upload
            }
            
            console.log(`🔄 Tentative de re-upload pour corriger le document corrompu`);
            
            // Marquer comme étant en cours de correction pour éviter les futures boucles
            if (!(SecureCloudStorage as any).skippedUploadIds) {
              (SecureCloudStorage as any).skippedUploadIds = new Set();
            }
            (SecureCloudStorage as any).skippedUploadIds.add(measurement.id);
            AsyncStorage.setItem(SKIPPED_UPLOAD_IDS_KEY, JSON.stringify(Array.from((SecureCloudStorage as any).skippedUploadIds))).catch(()=>{});
          }
          
          console.log(`📤 Mesure ${measurement.id} sera uploadée vers le cloud`);
          measuresToUpload.push(measurement);
        } else {
          console.log(`✅ Mesure ${measurement.id} déjà présente dans le cloud`);
        }
      }
      
      console.log(`☁️ Envoi de ${measuresToUpload.length} nouvelles mesures vers le cloud`);
      
      // Ajouter les nouvelles mesures localement
      for (const measurement of measuresToAdd) {
        await addMeasurementLocal({
          timestamp: measurement.timestamp,
          value: measurement.value,
          type: measurement.type,
          notes: measurement.notes || ''
        });
      }
      
      // Envoyer les mesures locales vers le cloud
      for (const measurement of measuresToUpload) {
        await SecureCloudStorage.saveMeasurement(measurement);
      }
      
      console.log(`✅ Fusion terminée: ${measuresToAdd.length} ajoutées localement, ${measuresToUpload.length} envoyées au cloud`);
    } catch (error) {
      console.error('❌ Échec de la fusion des mesures:', error);
    }
  }

  // Synchroniser avec le cloud (opérations en attente et récupération)
  static async syncWithCloud(): Promise<void> {
    // Vérifier le circuit breaker en premier
    const isCircuitOpen = await CorruptionCircuitBreaker.isOpen();
    if (isCircuitOpen) {
      const status = await CorruptionCircuitBreaker.getStatus();
      console.log(`🚨 Synchronisation bloquée par circuit breaker: ${status}`);
      return;
    }
    
    // Vérifier si une sync est déjà en cours
    if (this.syncInProgress) {
      console.log("⏳ Synchronisation déjà en cours, ignorée");
      return;
    }

    // Debounce : éviter les syncs trop fréquentes
    const now = Date.now();
    if (now - this.lastSyncTime < this.SYNC_DEBOUNCE_MS) {
      console.log("⏳ Synchronisation trop récente, ignorée");
      return;
    }

    this.syncInProgress = true;
    this.lastSyncTime = now;

    console.log("🔄 Démarrage de la synchronisation avec le cloud");
    
    try {
      // Vérifier si la synchronisation est activée et l'utilisateur est connecté
      if (!await this.isSyncEnabled()) {
        console.log("❌ Synchronisation désactivée dans les paramètres");
        return;
      }
      
      if (!auth.currentUser) {
        console.log("❌ Utilisateur non authentifié");
        return;
      }
      
      // Vérifier la connectivité réseau
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        console.log("❌ Pas de connexion internet");
        return;
      }
      
      console.log("👉 Étape 1: Traitement des opérations en attente");
      // 1. Traiter les opérations en attente
      await this.processPendingOperations();
      
      console.log("👉 Étape 2: Récupération des mesures depuis le cloud");
      // 2. Récupérer les mesures cloud
      const cloudMeasurements = await SecureCloudStorage.getMeasurements();
      console.log(`📊 ${cloudMeasurements.length} mesures trouvées dans le cloud`);
      
      console.log("👉 Étape 3: Fusion des données cloud avec les données locales");
      // 3. Synchroniser avec le stockage local
      await this.mergeMeasurements(cloudMeasurements);
      
      // 4. Mettre à jour l'horodatage de dernière synchronisation
      const syncTime = Date.now();
      await AsyncStorage.setItem(LAST_SYNC_KEY, syncTime.toString());
      console.log(`✅ Synchronisation terminée avec succès à ${new Date(syncTime).toLocaleString()}`);
    } catch (error) {
      console.error('❌ Échec de la synchronisation cloud:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Traiter les opérations en attente
  private static async processPendingOperations(): Promise<void> {
    try {
      // Récupérer les opérations en attente
      const pendingOpsJson = await AsyncStorage.getItem(PENDING_SYNC_OPERATIONS);
      if (!pendingOpsJson) return;
      
      const pendingOps: PendingSyncOperation[] = JSON.parse(pendingOpsJson);
      if (pendingOps.length === 0) return;
      
      // Trier par horodatage (plus ancien d'abord)
      pendingOps.sort((a, b) => a.timestamp - b.timestamp);
      
      const successfulOps: number[] = [];
      
      // Traiter chaque opération
      for (let i = 0; i < pendingOps.length; i++) {
        const op = pendingOps[i];
        // Respecter nextAttempt si défini
        if (op.nextAttempt && op.nextAttempt > Date.now()) {
          continue;
        }
        
        try {
          switch (op.type) {
            case 'add':
              if (op.data) {
                // Récupérer la mesure locale pour obtenir l'ID
                const localMeasurements = await getStoredMeasurementsLocal();
                const localMeasurement = localMeasurements.find(m => m.id === op.measurementId);
                
                if (localMeasurement) {
                  await SecureCloudStorage.saveMeasurement(localMeasurement);
                }
              }
              break;
              
            case 'delete':
              await SecureCloudStorage.deleteMeasurement(op.measurementId);
              break;
          }
          
          // Marquer l'opération comme réussie
          successfulOps.push(i);
        } catch (error) {
          console.error(`Échec de l'opération en attente ${op.type} pour ${op.measurementId}:`, error);
          // Exponential backoff
          const attempts = (op.attempts || 0) + 1;
          const baseDelayMs = 5000; // 5s
          const maxDelayMs = 10 * 60 * 1000; // 10min
          const delay = Math.min(baseDelayMs * Math.pow(2, attempts - 1), maxDelayMs);
          op.attempts = attempts;
          op.nextAttempt = Date.now() + delay;
        }
      }
      
      // Supprimer les opérations réussies (dans l'ordre inverse pour éviter les problèmes d'index)
      for (let i = successfulOps.length - 1; i >= 0; i--) {
        pendingOps.splice(successfulOps[i], 1);
      }
      
      // Mettre à jour le stockage avec les opérations restantes
      if (pendingOps.length > 0) {
        await AsyncStorage.setItem(PENDING_SYNC_OPERATIONS, JSON.stringify(pendingOps));
      } else {
        await AsyncStorage.removeItem(PENDING_SYNC_OPERATIONS);
      }
    } catch (error) {
      console.error('Échec du traitement des opérations en attente:', error);
    }
  }

  // Obtenir des informations sur la dernière synchronisation
  static async getSyncStatus(): Promise<{
    enabled: boolean;
    lastSync: number | null;
    pendingOperations: number;
  }> {
    try {
      const enabled = await this.isSyncEnabled();
      
      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : null;
      
      const pendingOpsJson = await AsyncStorage.getItem(PENDING_SYNC_OPERATIONS);
      const pendingOps: PendingSyncOperation[] = pendingOpsJson 
        ? JSON.parse(pendingOpsJson) 
        : [];
      
      return {
        enabled,
        lastSync,
        pendingOperations: pendingOps.length
      };
    } catch (error) {
      console.error('Échec de la récupération du statut de synchronisation:', error);
      return {
        enabled: false,
        lastSync: null,
        pendingOperations: 0
      };
    }
  }

  // Obtenir l'heure de la dernière synchronisation
  static async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return lastSyncStr ? parseInt(lastSyncStr, 10) : null;
    } catch (error) {
      console.error('Échec de la récupération de l\'heure de dernière synchronisation:', error);
      return null;
    }
  }

  // Obtenir le nombre d'opérations en attente
  static async getPendingOperationsCount(): Promise<number> {
    try {
      const pendingOpsJson = await AsyncStorage.getItem(PENDING_SYNC_OPERATIONS);
      const pendingOps: PendingSyncOperation[] = pendingOpsJson 
        ? JSON.parse(pendingOpsJson) 
        : [];
      
      return pendingOps.length;
    } catch (error) {
      console.error('Échec de la récupération du nombre d\'opérations en attente:', error);
      return 0;
    }
  }

  /**
   * Nettoyage radical: suppression complète des documents corrompus
   */
  static async forceUploadBlockedMeasurements(): Promise<void> {
    try {
      console.log('🔧 Déblocage radical: suppression des documents corrompus...');
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      // 🔍 Scanner TOUS les documents du cloud pour cet utilisateur
      console.log('🔍 Scan de TOUS les documents du cloud...');
      const measurementsRef = collection(db, MEASUREMENTS_COLLECTION);
      const q = query(measurementsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      console.log(`📊 ${snapshot.docs.length} documents trouvés dans le cloud`);
      
      const documentsToDelete: string[] = [];
      
      // Vérifier chaque document
      for (const document of snapshot.docs) {
        const docId = document.id;
        const data = document.data();
        
        console.log(`� Vérification document: ${docId}`);
        
        // Vérifier si le document est corrompu
        let isCorrupted = false;
        
        if (!data.encryptedData || data.encryptedData === 'CORRUPTED_DATA_FLAGGED') {
          console.log(`❌ Document ${docId} sans données chiffrées`);
          isCorrupted = true;
        } else {
          try {
            // Essayer de déchiffrer
            const result = EncryptionService.tryDecryptWithAnyKey(data.encryptedData);
            if (!result.data || typeof result.data !== 'object') {
              throw new Error('Données déchiffrées invalides');
            }
            console.log(`✅ Document ${docId} valide`);
          } catch (error) {
            console.log(`❌ Document ${docId} corrompu:`, (error as Error).message);
            isCorrupted = true;
          }
        }
        
        if (isCorrupted) {
          documentsToDelete.push(docId);
        }
      }
      
      console.log(`🗑️ ${documentsToDelete.length} documents corrompus à supprimer`);
      
      // Supprimer les documents corrompus avec writeBatch
      if (documentsToDelete.length > 0) {
        const batch = writeBatch(db);
        for (const docId of documentsToDelete) {
          const docRef = doc(db, MEASUREMENTS_COLLECTION, docId);
          batch.delete(docRef);
          console.log(`🗑️ Suppression document: ${docId}`);
        }
        
        try {
          await batch.commit();
          console.log(`✅ ${documentsToDelete.length} documents corrompus supprimés du cloud`);
        } catch (error) {
          console.warn(`⚠️ Erreur permissions lors de la suppression, mais continuons:`, (error as Error).message);
          // Continuer même en cas d'erreur de permissions
        }
      }
      
      // 🧹 Nettoyer TOUS les caches
      await AsyncStorage.multiRemove([
        EXISTING_CLOUD_IDS_KEY,
        SKIPPED_UPLOAD_IDS_KEY,
        CORRUPTED_IGNORE_KEY,
        'lastCloudDocIds',
        'syncMetadata',
        'deviceInfo'
      ]);
      
      // Nettoyer les caches mémoire
      (SecureCloudStorage as any).skippedUploadIds = new Set();
      (SecureCloudStorage as any).corruptedDocIds = new Set();
      (SecureCloudStorage as any).ignoredCorruptedIds = new Set();
      (SecureCloudStorage as any).lastCloudDocIds = new Set();
      
      console.log('🧹 Tous les caches nettoyés (local + mémoire)');
      console.log('✅ Nettoyage radical terminé, cloud propre pour nouveaux uploads');
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage radical:', error);
      throw error;
    }
  }
}
