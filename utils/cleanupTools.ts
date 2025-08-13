/**
 * Utilitaire pour supprimer définitivement des documents problématiques de Firestore
 * À utiliser uniquement en cas de nécessité absolue
 */

import { db } from '@/config/firebase';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';

/**
 * Supprime un document problématique spécifique par son ID
 * @param documentId ID complet du document à supprimer
 * @param collection Collection Firestore contenant le document
 */
export async function deleteProblematicDocument(
  documentId: string,
  collection: string = 'encrypted_measurements'
): Promise<void> {
  try {
    await deleteDoc(doc(db, collection, documentId));
    console.log(`✅ Document supprimé avec succès: ${documentId}`);
    return;
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression du document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Supprime un ensemble de documents problématiques identifiés
 * Utilise une approche de marquage avant suppression pour contourner les problèmes de permissions
 */
export async function cleanupKnownProblematicDocuments(): Promise<void> {
  const knownProblematicDocs = [
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0'
  ];
  
  console.log(`🧹 Nettoyage de ${knownProblematicDocs.length} documents problématiques...`);
  
  let successCount = 0;
  let failureCount = 0;
  let markedCount = 0;
  
  for (const docId of knownProblematicDocs) {
    try {
      // Essayer de supprimer directement
      await deleteDoc(doc(db, 'encrypted_measurements', docId));
      successCount++;
      console.log(`✅ Document supprimé: ${docId}`);
    } catch (deleteError: any) {
      try {
        // Si suppression échoue, marquer comme corrompu
        const docRef = doc(db, 'encrypted_measurements', docId);
        await setDoc(docRef, {
          isCorrupted: true,
          encryptedData: 'CORRUPTED_DATA_FLAGGED',
          corruptedAt: Date.now(),
          cleanupAttempted: true
        }, { merge: true });
        markedCount++;
        console.log(`🏷️ Document marqué comme corrompu: ${docId}`);
      } catch (markError) {
        failureCount++;
        console.error(`❌ Échec total pour ${docId}:`, {
          deleteError: deleteError.message,
          markError: (markError as any).message
        });
      }
    }
  }
  
  console.log(`🏁 Nettoyage terminé: ${successCount} supprimés, ${markedCount} marqués, ${failureCount} échecs`);
}

/**
 * Nouvelle fonction pour nettoyer via marquage seulement
 */
export async function markProblematicDocumentsAsCorrupted(): Promise<void> {
  const { auth } = await import('@/config/firebase');
  const { setDoc } = await import('firebase/firestore');
  
  if (!auth.currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  const knownProblematicDocs = [
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0'
  ];
  
  console.log(`🏷️ Marquage de ${knownProblematicDocs.length} documents comme corrompus...`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const docId of knownProblematicDocs) {
    try {
      const docRef = doc(db, 'encrypted_measurements', docId);
      await setDoc(docRef, {
        userId: auth.currentUser.uid, // S'assurer que userId est correct
        isCorrupted: true,
        encryptedData: 'CORRUPTED_DATA_FLAGGED',
        corruptedAt: Date.now(),
        cleanupAttempted: true,
        lastModified: Date.now()
      }, { merge: true });
      successCount++;
      console.log(`✅ Document marqué: ${docId}`);
    } catch (error) {
      failureCount++;
      console.error(`❌ Échec marquage pour ${docId}:`, error);
    }
  }
  
  console.log(`🏁 Marquage terminé: ${successCount} réussis, ${failureCount} échecs`);
}
