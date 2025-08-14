/**
 * Script de réparation complète de la base Firebase
 * Ce script permet de détecter et réparer tous les problèmes de synchronisation
 */

import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './logService';
import { StorageManager } from './storageManager';

/**
 * Classe utilitaire pour la réparation complète de la base de données
 */
export class FirebaseRepairTool {
  // Stockage des documents problématiques
  private static corruptedIds = new Set<string>();
  private static processingStatus = {
    totalDocuments: 0,
    corruptedDocuments: 0,
    deletedDocuments: 0,
    repairedDocuments: 0,
    progress: 0
  };

  /**
   * Analyse complète de la base Firestore pour l'utilisateur actuel
   * @returns Un rapport de diagnostic complet
   */
  static async analyzeDatabase(): Promise<{ status: string; report: any }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { status: 'error', report: { error: 'Utilisateur non connecté' } };
      }

      this.resetStatus();

      // 1. Récupérer tous les documents de l'utilisateur
      const q = query(
        collection(db, 'encrypted_measurements'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      this.processingStatus.totalDocuments = snapshot.size;
      
      // 2. Analyser chaque document
      let corruptedDocs = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        try {
          // Vérifier si le document est déjà marqué comme corrompu
          if (data.isCorrupted === true) {
            this.corruptedIds.add(docId);
            corruptedDocs.push({
              id: docId,
              reason: 'Marqué comme corrompu',
              timestamp: data.timestamp || data.lastModified || 0
            });
            this.processingStatus.corruptedDocuments++;
            continue;
          }
          
          // Vérifier si le document contient les champs requis
          if (!data.encryptedData || !data.measurementId || !data.timestamp) {
            this.corruptedIds.add(docId);
            corruptedDocs.push({
              id: docId,
              reason: 'Structure de document invalide',
              timestamp: data.timestamp || data.lastModified || 0
            });
            this.processingStatus.corruptedDocuments++;
            continue;
          }
          
          // Vérifier si le document a l'ID approprié (doit contenir l'UID)
          if (!docId.includes(user.uid)) {
            this.corruptedIds.add(docId);
            corruptedDocs.push({
              id: docId,
              reason: 'Format d\'ID incorrect',
              timestamp: data.timestamp || data.lastModified || 0
            });
            this.processingStatus.corruptedDocuments++;
            continue;
          }
        } catch (error) {
          this.corruptedIds.add(docId);
          corruptedDocs.push({
            id: docId,
            reason: 'Erreur lors de l\'analyse',
            error: String(error),
            timestamp: data.timestamp || data.lastModified || 0
          });
          this.processingStatus.corruptedDocuments++;
        }
        
        this.processingStatus.progress = Math.floor((snapshot.docs.indexOf(docSnap) + 1) / snapshot.size * 100);
      }
      
      // Trier les documents corrompus par timestamp
      corruptedDocs.sort((a, b) => b.timestamp - a.timestamp);
      
      return {
        status: 'success',
        report: {
          totalDocuments: this.processingStatus.totalDocuments,
          corruptedDocuments: this.processingStatus.corruptedDocuments,
          corruptedList: corruptedDocs,
          progress: 100
        }
      };
    } catch (error: unknown) {
      logError(error);
      return {
        status: 'error',
        report: {
          error: error instanceof Error ? error.message : String(error),
          progress: this.processingStatus.progress
        }
      };
    }
  }
  
  /**
   * Répare la base de données en supprimant les documents corrompus
   * @param options Options de réparation
   * @returns Résultat de la réparation
   */
  static async repairDatabase(options: {
    deleteCorrupted?: boolean;
    resetSyncState?: boolean;
  } = {}): Promise<{ status: string; report: any }> {
    const { deleteCorrupted = true, resetSyncState = true } = options;
    
    try {
      const user = auth.currentUser;
      if (!user) {
        return { status: 'error', report: { error: 'Utilisateur non connecté' } };
      }

      // Si l'analyse n'a pas été faite, faire l'analyse d'abord
      if (this.processingStatus.totalDocuments === 0) {
        await this.analyzeDatabase();
      }
      
      // 1. Supprimer les documents corrompus si demandé
      if (deleteCorrupted && this.corruptedIds.size > 0) {
        for (const docId of this.corruptedIds) {
          try {
            await deleteDoc(doc(db, 'encrypted_measurements', docId));
            this.processingStatus.deletedDocuments++;
          } catch (error) {
            console.error(`Erreur lors de la suppression du document ${docId}:`, error);
            
            // Essayer de marquer comme corrompu si la suppression échoue
            try {
              await updateDoc(doc(db, 'encrypted_measurements', docId), {
                isCorrupted: true,
                needsCleanup: true,
                corruptedAt: Date.now()
              });
              this.processingStatus.repairedDocuments++;
            } catch (innerError) {
              console.error(`Échec du marquage du document ${docId}:`, innerError);
            }
          }
        }
      }
      
      // 2. Réinitialiser l'état de synchronisation si demandé
      if (resetSyncState) {
        const syncStateKey = `@syncState_${user.uid}`;
        await AsyncStorage.setItem(syncStateKey, JSON.stringify({
          lastSync: null,
          pendingOperations: [],
          hasConflicts: false,
          initialized: true,
          syncEnabled: true
        }));
        
        // Mettre à jour les métadonnées de synchronisation dans Firestore
        try {
          await setDoc(doc(db, 'sync_metadata', user.uid), {
            lastSync: null,
            deviceCount: 1,
            resetAt: Date.now(),
            syncEnabled: true
          });
        } catch (error) {
          console.error('Erreur lors de la réinitialisation des métadonnées de synchronisation:', error);
        }
      }
      
      // 3. Forcer une réinitialisation du StorageManager
      try {
        // Réinitialiser le StorageManager
        await StorageManager.initialize();
      } catch (error) {
        console.error('Erreur lors de la réinitialisation du gestionnaire de stockage:', error);
      }
      
      return {
        status: 'success',
        report: {
          totalDocuments: this.processingStatus.totalDocuments,
          corruptedDocuments: this.processingStatus.corruptedDocuments,
          deletedDocuments: this.processingStatus.deletedDocuments,
          repairedDocuments: this.processingStatus.repairedDocuments,
          resetSyncState: resetSyncState
        }
      };
    } catch (error: unknown) {
      logError(error);
      return {
        status: 'error',
        report: {
          error: error instanceof Error ? error.message : String(error),
          progress: this.processingStatus.progress
        }
      };
    }
  }
  
  /**
   * Réinitialise le statut de traitement
   */
  private static resetStatus() {
    this.corruptedIds.clear();
    this.processingStatus = {
      totalDocuments: 0,
      corruptedDocuments: 0,
      deletedDocuments: 0,
      repairedDocuments: 0,
      progress: 0
    };
  }
}
