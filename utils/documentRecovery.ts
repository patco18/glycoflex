import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { EncryptionService } from './secureCloudStorage';
import { showToast } from '@/hooks/useToast';

/**
 * Utilitaire avancé pour corriger ou récupérer des documents corrompus
 */
export class DocumentRecoveryTools {
  /**
   * Tente de réparer un document spécifique avec une clé alternative
   */
  static async attemptDocumentRepair(documentId: string, alternativeKey?: string): Promise<boolean> {
    try {
      // Vérifier l'authentification
      if (!auth.currentUser) {
        throw new Error("L'utilisateur doit être connecté");
      }
      
      console.log(`🔧 Tentative de réparation du document: ${documentId}`);
      
      // Récupérer le document
      const docRef = doc(db, 'encrypted_measurements', documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.warn(`⚠️ Document inexistant: ${documentId}`);
        return false;
      }
      
      const data = docSnap.data();
      
      // Vérifier le propriétaire
      if (data.userId !== auth.currentUser.uid) {
        console.warn(`⚠️ Document appartenant à un autre utilisateur: ${data.userId}`);
        return false;
      }
      
      // Vérifier si le document est déjà marqué comme corrompu
      if (data.isCorrupted === true || !data.encryptedData || data.encryptedData === 'CORRUPTED_DATA_FLAGGED') {
        console.warn(`⚠️ Document déjà marqué comme corrompu: ${documentId}`);
        return false;
      }
      
      // Si une clé alternative est fournie, l'ajouter temporairement aux clés legacy
      let usedAltKey = false;
      if (alternativeKey) {
        await EncryptionService.addLegacyKeyCandidate(alternativeKey);
        console.log('🔑 Clé alternative ajoutée temporairement');
      }
      
      // Tenter le déchiffrement
      try {
        const encryptedData = data.encryptedData;
        const tryAny = EncryptionService.tryDecryptWithAnyKey(encryptedData);
        
        if (tryAny.data && typeof tryAny.data === 'object') {
          // Réchiffrement avec la clé principale
          if (tryAny.usedLegacy) {
            usedAltKey = true;
            const reencrypted = EncryptionService.encrypt(tryAny.data);
            
            // Mettre à jour le document avec les données réchiffrées
            await setDoc(docRef, {
              userId: data.userId,
              measurementId: data.measurementId,
              encryptedData: reencrypted,
              timestamp: tryAny.data.timestamp || data.timestamp,
              lastModified: Date.now(),
              isCorrupted: false // Marquer explicitement comme non corrompu
            });
            
            console.log(`✅ Document réparé avec succès (réchiffré): ${documentId}`);
            return true;
          } else {
            console.log(`✅ Document déjà utilisable avec la clé actuelle: ${documentId}`);
            return true;
          }
        }
      } catch (error) {
        console.error(`❌ Échec du déchiffrement lors de la réparation: ${documentId}`, error);
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Erreur lors de la tentative de réparation: ${documentId}`, error);
      return false;
    }
  }
  
  /**
   * Analyse tous les documents marqués comme corrompus et tente de les réparer avec une clé alternative
   */
  static async scanAndRepairCorruptedDocuments(alternativeKey?: string): Promise<{
    found: number;
    fixed: number;
    failed: number;
  }> {
    try {
      if (!auth.currentUser) {
        throw new Error("L'utilisateur doit être connecté");
      }
      
      const userId = auth.currentUser.uid;
      console.log(`🔍 Recherche des documents corrompus pour l'utilisateur ${userId}`);
      
      // Requête pour trouver les documents corrompus
      const q = query(
        collection(db, 'encrypted_measurements'),
        where('userId', '==', userId),
        where('isCorrupted', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const corruptedDocs = querySnapshot.docs;
      
      console.log(`🔍 ${corruptedDocs.length} documents corrompus trouvés`);
      
      let fixedCount = 0;
      let failedCount = 0;
      
      // Pour chaque document, tenter la réparation
      for (const doc of corruptedDocs) {
        const success = await this.attemptDocumentRepair(doc.id, alternativeKey);
        if (success) {
          fixedCount++;
        } else {
          failedCount++;
        }
      }
      
      const result = {
        found: corruptedDocs.length,
        fixed: fixedCount,
        failed: failedCount
      };
      
      console.log(`📊 Résultat de la réparation: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse et réparation:', error);
      return { found: 0, fixed: 0, failed: 0 };
    }
  }
  
  /**
   * Tente de modifier la clé d'un document spécifique pour lui attribuer un userId valide
   * Utile pour les documents dont l'userId ne correspond pas
   */
  static async fixDocumentOwnership(documentId: string): Promise<boolean> {
    try {
      if (!auth.currentUser) return false;
      
      // Analyser l'ID pour extraire l'ID de mesure (partie après le _)
      const parts = documentId.split('_');
      if (parts.length !== 2) {
        console.warn(`⚠️ Format d'ID invalide: ${documentId}`);
        return false;
      }
      
      const measurementId = parts[1];
      const userId = auth.currentUser.uid;
      const newDocId = `${userId}_${measurementId}`;
      
      // Vérifier si un document avec le nouvel ID existe déjà
      const newDocRef = doc(db, 'encrypted_measurements', newDocId);
      const newDocSnap = await getDoc(newDocRef);
      
      if (newDocSnap.exists()) {
        console.warn(`⚠️ Un document existe déjà avec l'ID: ${newDocId}`);
        return false;
      }
      
      // Récupérer le document original
      const originalDocRef = doc(db, 'encrypted_measurements', documentId);
      const originalDocSnap = await getDoc(originalDocRef);
      
      if (!originalDocSnap.exists()) {
        console.warn(`⚠️ Document source inexistant: ${documentId}`);
        return false;
      }
      
      const data = originalDocSnap.data();
      
      // Créer un nouveau document avec l'ID correct
      await setDoc(newDocRef, {
        ...data,
        userId, // Mettre à jour l'userId
        measurementId,
        lastModified: Date.now()
      });
      
      console.log(`✅ Document migré avec succès: ${documentId} -> ${newDocId}`);
      
      // On ne supprime pas l'original par sécurité
      // L'utilisateur devra le faire manuellement s'il le souhaite
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors de la correction de propriété: ${documentId}`, error);
      return false;
    }
  }

  /**
   * Affiche une alerte pour confirmer l'opération de réparation
   */
  static showRepairConfirmation(
    title: string,
    message: string,
    onConfirm: () => void
  ): void {
    showToast(
      title,
      message,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Continuer',
          onPress: onConfirm,
          style: 'destructive',
        },
      ]
    );
  }
}
