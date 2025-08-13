/**
 * Script de nettoyage des documents corrompus dans Firestore
 * Exécuter avec : node cleanup-corrupted-docs.js
 */

const admin = require('firebase-admin');

// Configuration Firebase Admin (remplacez par vos vraies clés)
const serviceAccount = {
  // Vous devrez ajouter vos vraies clés de service Firebase Admin ici
  // ou les charger depuis un fichier de configuration séparé
};

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Remplacez par votre URL de base de données
    databaseURL: 'https://votre-project.firebaseio.com'
  });
}

const db = admin.firestore();

// Liste des documents corrompus identifiés dans les logs
const corruptedDocIds = [
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_175469543215302ywej825',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754786109398evbrncyd0',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17550000796030c18wkn6w'
];

async function cleanupCorruptedDocuments() {
  console.log('🧹 Début du nettoyage des documents corrompus...');
  
  const batch = db.batch();
  let deletedCount = 0;
  
  for (const docId of corruptedDocIds) {
    try {
      const docRef = db.collection('measurements').doc(docId);
      
      // Vérifier si le document existe
      const doc = await docRef.get();
      if (doc.exists) {
        console.log(`🗑️ Suppression du document corrompu: ${docId}`);
        batch.delete(docRef);
        deletedCount++;
      } else {
        console.log(`ℹ️ Document déjà supprimé: ${docId}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression de ${docId}:`, error);
    }
  }
  
  if (deletedCount > 0) {
    try {
      await batch.commit();
      console.log(`✅ ${deletedCount} documents corrompus supprimés avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de la validation du batch:', error);
    }
  } else {
    console.log('ℹ️ Aucun document corrompu trouvé à supprimer');
  }
  
  console.log('🎉 Nettoyage terminé !');
}

// Fonction pour supprimer TOUS les documents de la collection (option nucléaire)
async function nukeAllDocuments() {
  console.log('💥 ATTENTION: Suppression de TOUS les documents de la collection measurements...');
  
  const snapshot = await db.collection('measurements').get();
  const batch = db.batch();
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`💥 ${snapshot.docs.length} documents supprimés (option nucléaire)`);
}

// Exécuter le nettoyage
const args = process.argv.slice(2);

if (args.includes('--nuke')) {
  nukeAllDocuments()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
} else {
  cleanupCorruptedDocuments()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}
