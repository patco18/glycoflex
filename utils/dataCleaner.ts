import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { showToast } from '@/hooks/useToast';

/**
 * Utilitaire pour nettoyer les données corrompues dans Firestore
 */
export class DataCleaner {
  /**
   * Identifie et nettoie les documents problématiques pour un utilisateur
   * @param userId ID de l'utilisateur
   * @param mode 'delete' pour supprimer, 'flag' pour marquer comme corrompu
   * @returns Nombre de documents traités
   */
  static async cleanCorruptedMeasurements(
    userId: string,
    mode: 'delete' | 'flag' = 'flag'
  ): Promise<number> {
    try {
      // Liste des IDs problématiques connus
      const knownBadDocIds = [
        '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
        '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
        '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0'
      ];

      // Récupérer tous les documents de mesures de l'utilisateur
      const q = query(
        collection(db, 'encrypted_measurements'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      let processedDocs = 0;
      
      for (const document of querySnapshot.docs) {
        const docId = document.id;
        const data = document.data();
        
        // Vérifier si c'est un document problématique connu
        const isKnownBad = knownBadDocIds.includes(docId);
        
        // Vérifier si le document a des données potentiellement problématiques
        const isPotentiallyBad = !data.encryptedData || 
                                typeof data.encryptedData !== 'string' ||
                                data.encryptedData.length < 20 ||
                                !data.encryptedData.includes(':');
        
        if (isKnownBad || isPotentiallyBad) {
          if (mode === 'delete') {
            // Supprimer le document
            await deleteDoc(doc(db, 'encrypted_measurements', docId));
            console.log(`🧹 Document supprimé: ${docId}`);
          } else {
            // Marquer comme corrompu
            await updateDoc(doc(db, 'encrypted_measurements', docId), {
              isCorrupted: true,
              originalEncryptedData: data.encryptedData || null,
              encryptedData: 'CORRUPTED_DATA_FLAGGED'
            });
            console.log(`🚩 Document marqué comme corrompu: ${docId}`);
          }
          processedDocs++;
        }
      }
      
      return processedDocs;
    } catch (error) {
      console.error('Erreur lors du nettoyage des données:', error);
      showToast(
        'Erreur de nettoyage',
        'Une erreur est survenue lors du nettoyage des données corrompues.'
      );
      return 0;
    }
  }
  
  /**
   * Analyse les documents pour trouver des problèmes potentiels
   * @param userId ID de l'utilisateur
   * @returns Statistiques des problèmes trouvés
   */
  static async analyzeUserData(userId: string): Promise<{
    totalDocuments: number;
    potentiallyCorrupted: number;
    corruptedIds: string[];
  }> {
    try {
      const q = query(
        collection(db, 'encrypted_measurements'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const stats = {
        totalDocuments: querySnapshot.size,
        potentiallyCorrupted: 0,
        corruptedIds: [] as string[]
      };
      
      for (const document of querySnapshot.docs) {
        const docId = document.id;
        const data = document.data();
        
        // Vérifier si le document a des données potentiellement problématiques
        const isPotentiallyBad = !data.encryptedData || 
                                typeof data.encryptedData !== 'string' ||
                                data.encryptedData.length < 20 ||
                                !data.encryptedData.includes(':');
        
        if (isPotentiallyBad) {
          stats.potentiallyCorrupted++;
          stats.corruptedIds.push(docId);
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de l\'analyse des données:', error);
      return {
        totalDocuments: 0,
        potentiallyCorrupted: 0,
        corruptedIds: []
      };
    }
  }
}
