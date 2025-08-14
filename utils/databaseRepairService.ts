/**
 * Intégration entre le système de réparation Firebase et la gestion des clés d'encryption
 * Ce fichier facilite l'utilisation des outils de réparation avec les clés de chiffrement
 */

import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { EnhancedEncryptionService } from './enhancedCrypto';
import { trackCorruptedDocument } from './cleanupTools';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './logService';

interface RepairOptions {
  deleteCorrupted?: boolean;
  resetSyncState?: boolean;
  retestEncryption?: boolean;
}

/**
 * Service d'intégration pour la réparation Firebase et la gestion des clés
 */
export class DatabaseRepairService {
  /**
   * Analyse les problèmes de synchronisation et les erreurs de chiffrement
   */
  static async analyzeFullDatabase(): Promise<{
    status: string;
    data: {
      documentsAnalyzed: number;
      corruptedDocuments: number;
      encryptionStatus: {
        keyValid: boolean;
        keyVersion: number;
      };
      potentialIssues: string[];
    };
  }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          status: 'error',
          data: {
            documentsAnalyzed: 0,
            corruptedDocuments: 0,
            encryptionStatus: {
              keyValid: false,
              keyVersion: 0
            },
            potentialIssues: ['Utilisateur non connecté']
          }
        };
      }

      // Vérifier d'abord l'état de la clé d'encryption
      await EnhancedEncryptionService.initializeEncryptionKey();
      const encryptionTestResult = await EnhancedEncryptionService.testCrypto();
      
      // Récupérer la version de la clé
      const keyVersionStr = await AsyncStorage.getItem('GLYCOFLEX_KEY_VERSION');
      const keyVersion = keyVersionStr ? parseInt(keyVersionStr, 10) : 1;
      
      // Problèmes potentiels
      const potentialIssues: string[] = [];
      
      if (!encryptionTestResult) {
        potentialIssues.push('Échec du test de chiffrement. La clé actuelle pourrait être invalide.');
      }

      // Récupérer et analyser les documents
      const q = query(
        collection(db, 'encrypted_measurements'),
        where('userId', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      const documentsAnalyzed = snapshot.size;
      
      // Analyser chaque document pour détecter les corruptions
      const corruptedDocs: string[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Vérifier si le document est déjà marqué comme corrompu
        if (data.isCorrupted) {
          corruptedDocs.push(docSnapshot.id);
          continue;
        }
        
        // Vérifier si le document peut être déchiffré
        if (data.encryptedData) {
          try {
            // Tentative de déchiffrement pour vérifier l'intégrité
            await EnhancedEncryptionService.decrypt(data.encryptedData);
          } catch (error) {
            // Document corrompu détecté
            corruptedDocs.push(docSnapshot.id);
            trackCorruptedDocument(docSnapshot.id, error);
          }
        }
      }

      // Générer un rapport
      return {
        status: 'success',
        data: {
          documentsAnalyzed,
          corruptedDocuments: corruptedDocs.length,
          encryptionStatus: {
            keyValid: encryptionTestResult,
            keyVersion
          },
          potentialIssues
        }
      };
      
    } catch (error) {
      logError({
        message: 'Erreur lors de l\'analyse de la base de données',
        error
      });
      
      return {
        status: 'error',
        data: {
          documentsAnalyzed: 0,
          corruptedDocuments: 0,
          encryptionStatus: {
            keyValid: false,
            keyVersion: 0
          },
          potentialIssues: [`Erreur interne: ${String(error)}`]
        }
      };
    }
  }

  /**
   * Répare les problèmes de synchronisation et de chiffrement
   */
  static async repairDatabase(options: RepairOptions = {}): Promise<{
    status: string;
    data: {
      deletedDocuments: number;
      syncStateReset: boolean;
      encryptionRepaired: boolean;
      remainingIssues: string[];
    };
  }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          status: 'error',
          data: {
            deletedDocuments: 0,
            syncStateReset: false,
            encryptionRepaired: false,
            remainingIssues: ['Utilisateur non connecté']
          }
        };
      }

      // Réinitialiser l'encryption si demandé
      let encryptionRepaired = false;
      if (options.retestEncryption) {
        // Tester d'abord
        const encryptionTestResult = await EnhancedEncryptionService.testCrypto();
        
        if (!encryptionTestResult) {
          // Réparer en réinitialisant la clé
          await EnhancedEncryptionService.resetEncryptionKey();
          encryptionRepaired = true;
        }
      }

      // Récupérer les documents corrompus
      const q = query(
        collection(db, 'encrypted_measurements'),
        where('userId', '==', user.uid),
        where('isCorrupted', '==', true)
      );
      
      const snapshot = await getDocs(q);
      let deletedCount = 0;
      
      // Supprimer les documents corrompus si demandé
      if (options.deleteCorrupted) {
        for (const docSnapshot of snapshot.docs) {
          try {
            await deleteDoc(doc(db, 'encrypted_measurements', docSnapshot.id));
            deletedCount++;
          } catch (error) {
            logError({
              message: `Échec suppression document ${docSnapshot.id}`,
              error
            });
          }
        }
      }

      // Réinitialiser l'état de synchronisation si demandé
      let syncStateReset = false;
      if (options.resetSyncState) {
        await AsyncStorage.removeItem('LAST_SYNC_TIMESTAMP');
        await AsyncStorage.removeItem('SYNC_IN_PROGRESS');
        syncStateReset = true;
      }

      // Vérifier s'il reste des problèmes
      const remainingIssues: string[] = [];
      const postRepairAnalysis = await this.analyzeFullDatabase();
      
      if (postRepairAnalysis.status === 'success' && postRepairAnalysis.data.corruptedDocuments > 0) {
        remainingIssues.push(`Il reste ${postRepairAnalysis.data.corruptedDocuments} documents corrompus.`);
      }
      
      if (postRepairAnalysis.status === 'success' && !postRepairAnalysis.data.encryptionStatus.keyValid) {
        remainingIssues.push('La clé de chiffrement est toujours invalide.');
      }

      return {
        status: 'success',
        data: {
          deletedDocuments: deletedCount,
          syncStateReset,
          encryptionRepaired,
          remainingIssues
        }
      };
      
    } catch (error) {
      logError({
        message: 'Erreur lors de la réparation de la base de données',
        error
      });
      
      return {
        status: 'error',
        data: {
          deletedDocuments: 0,
          syncStateReset: false,
          encryptionRepaired: false,
          remainingIssues: [`Erreur interne: ${String(error)}`]
        }
      };
    }
  }

  /**
   * Fonction pour réinitialiser complètement la synchronisation
   * Cette fonction combine la réinitialisation de la clé et la suppression des documents problématiques
   */
  static async fullReset(): Promise<{
    status: string;
    data: {
      keyReset: boolean;
      documentsDeleted: number;
      syncReset: boolean;
      cacheCleared: boolean;
    };
  }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          status: 'error',
          data: {
            keyReset: false,
            documentsDeleted: 0,
            syncReset: false,
            cacheCleared: false
          }
        };
      }

      // 1. Réinitialiser la clé d'encryption
      let keyReset = false;
      try {
        await EnhancedEncryptionService.resetEncryptionKey();
        keyReset = true;
      } catch (error) {
        logError({
          message: 'Échec réinitialisation clé',
          error
        });
      }

      // 2. Supprimer les documents problématiques
      let documentsDeleted = 0;
      try {
        const repairResult = await this.repairDatabase({
          deleteCorrupted: true,
          resetSyncState: true
        });
        
        if (repairResult.status === 'success') {
          documentsDeleted = repairResult.data.deletedDocuments;
        }
      } catch (error) {
        logError({
          message: 'Échec suppression documents',
          error
        });
      }

      // 3. Réinitialiser l'état de synchronisation
      let syncReset = false;
      let cacheCleared = false;
      try {
        // Réinitialiser les marqueurs de synchro
        await AsyncStorage.removeItem('LAST_SYNC_TIMESTAMP');
        await AsyncStorage.removeItem('SYNC_IN_PROGRESS');
        syncReset = true;
        
        // Vider le cache local si possible
        const clearKeys = [
          'GLYCOFLEX_MEASUREMENTS_CACHE',
          'GLYCOFLEX_SETTINGS_CACHE',
          'GLYCOFLEX_TEMP_SYNC_DATA'
        ];
        
        for (const key of clearKeys) {
          await AsyncStorage.removeItem(key);
        }
        
        cacheCleared = true;
      } catch (error) {
        logError({
          message: 'Échec nettoyage cache',
          error
        });
      }

      return {
        status: 'success',
        data: {
          keyReset,
          documentsDeleted,
          syncReset,
          cacheCleared
        }
      };
      
    } catch (error) {
      logError({
        message: 'Erreur lors de la réinitialisation complète',
        error
      });
      
      return {
        status: 'error',
        data: {
          keyReset: false,
          documentsDeleted: 0,
          syncReset: false,
          cacheCleared: false
        }
      };
    }
  }
}
