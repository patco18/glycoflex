/**
 * Utilitaire de réparation des documents corrompus
 * Ce module permet d'identifier, sauvegarder et réparer les documents
 * corrompus dans Firebase Firestore
 */
import { doc, collection, query, where, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLogger } from './loggerExports';

const logger = new AppLogger('DataRepair');

/**
 * Trouve tous les documents corrompus pour un utilisateur
 */
export const findCorruptedDocuments = async (userId: string) => {
  try {
    // Rechercher les documents marqués comme corrompus
    const q = query(
      collection(db, 'encrypted_measurements'),
      where('userId', '==', userId),
      where('isCorrupted', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const corruptedDocs = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      data: doc.data(),
      ref: doc.ref
    }));
    
    logger.info(`Trouvé ${corruptedDocs.length} documents corrompus`);
    return corruptedDocs;
  } catch (error) {
    logger.error(`Erreur lors de la recherche des documents corrompus`, error);
    throw error;
  }
};

/**
 * Crée une sauvegarde locale des documents corrompus
 */
export const backupCorruptedDocuments = async (corruptedDocs: any[]) => {
  try {
    // Créer une sauvegarde horodatée
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `corrupt_backup_${timestamp}`;
    
    // Sauvegarder dans le stockage local
    await AsyncStorage.setItem(backupKey, JSON.stringify(corruptedDocs));
    
    logger.info(`${corruptedDocs.length} documents sauvegardés sous ${backupKey}`);
    return backupKey;
  } catch (error) {
    logger.error(`Erreur lors de la sauvegarde des documents corrompus`, error);
    throw error;
  }
};

/**
 * Réinitialise le circuit breaker pour un utilisateur
 */
export const resetCircuitBreaker = async (userId: string) => {
  try {
    // Supprimer les informations du circuit breaker du stockage local
    await AsyncStorage.removeItem(`circuitbreaker_${userId}`);
    
    // Réinitialiser le compteur de corruption
    await AsyncStorage.removeItem(`corruption_count_${userId}`);
    
    logger.info(`Circuit breaker réinitialisé pour l'utilisateur ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la réinitialisation du circuit breaker`, error);
    throw error;
  }
};

/**
 * Supprime les documents corrompus et les recrée avec un format valide
 */
export const recreateDocumentsWithValidFormat = async (corruptedDocs: any[], userId: string, localData: any[] = []) => {
  try {
    let recreatedCount = 0;
    let deletedCount = 0;
    
    // Pour chaque document corrompu
    for (const docInfo of corruptedDocs) {
      try {
        // Supprimer le document corrompu
        await deleteDoc(docInfo.ref);
        deletedCount++;
        
        // Chercher si des données locales correspondent
        const localMatch = localData.find(item => item.id === docInfo.id.replace(`${userId}_`, ''));
        
        if (localMatch) {
          // Recréer le document avec les données locales
          const docRef = doc(db, 'encrypted_measurements', docInfo.id);
          await setDoc(docRef, {
            userId: userId,
            encryptedData: localMatch.encryptedData,
            timestamp: localMatch.timestamp || Date.now(),
            lastModified: Date.now(),
            measurementId: localMatch.id,
            isCorrupted: false
          });
          recreatedCount++;
        }
      } catch (innerError) {
        logger.error(`Échec de la réparation du document ${docInfo.id}`, innerError);
      }
    }
    
    logger.info(`Réparation terminée: ${deletedCount} supprimés, ${recreatedCount} recréés`);
    return { deletedCount, recreatedCount };
  } catch (error) {
    logger.error(`Erreur lors de la recréation des documents`, error);
    throw error;
  }
};

/**
 * Fonction principale pour réparer les données corrompues
 */
export const repairCorruptedData = async (userId: string, localData: any[] = []) => {
  try {
    logger.info(`Début du processus de réparation pour l'utilisateur ${userId}`);
    
    // 1. Identifier les documents corrompus
    const corruptedDocs = await findCorruptedDocuments(userId);
    
    if (corruptedDocs.length === 0) {
      logger.info('Aucun document corrompu trouvé');
      return { success: true, message: 'Aucune réparation nécessaire' };
    }
    
    // 2. Créer des copies de sauvegarde
    const backupKey = await backupCorruptedDocuments(corruptedDocs);
    
    // 3. Réinitialiser le circuit breaker
    await resetCircuitBreaker(userId);
    
    // 4. Recréer les documents avec un format correct
    const result = await recreateDocumentsWithValidFormat(corruptedDocs, userId, localData);
    
    return { 
      success: true, 
      message: `Réparation réussie: ${result.recreatedCount}/${corruptedDocs.length} documents réparés`,
      backupKey,
      ...result
    };
  } catch (error) {
    logger.error('Échec du processus de réparation', error);
    return { 
      success: false, 
      message: `Échec de la réparation: ${(error as Error).message}` 
    };
  }
};
