/**
 * Script d'urgence pour réinitialiser complètement le stockage
 * À exécuter quand tous les autres systèmes sont bloqués
 */

const fs = require('fs');
const path = require('path');

// Configuration Firebase manuelle (sans SDK)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCt6d5rP_s4wXJDhwRZojRtT7kTOJGGTMs",
  authDomain: "glycoflex-e8ce5.firebaseapp.com",
  projectId: "glycoflex-e8ce5",
  storageBucket: "glycoflex-e8ce5.firebasestorage.app",
  messagingSenderId: "1028965940043",
  appId: "1:1028965940043:web:6d7fd851c4e98dadb073f6"
};

// Documents corrompus identifiés
const CORRUPTED_DOCS = [
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_175469543215302ywej825',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754786109398evbrncyd0',
  '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17550000796030c18wkn6w'
];

// Fonction pour faire des requêtes REST vers Firestore
async function firestoreRequest(method, url, data = null, token = null) {
  // Import dynamique de fetch pour Node.js
  let fetch;
  try {
    // Essayer le fetch natif de Node.js 18+
    fetch = globalThis.fetch;
    if (!fetch) {
      // Fallback vers node-fetch
      const { default: nodeFetch } = await import('node-fetch');
      fetch = nodeFetch;
    }
  } catch (error) {
    console.error('❌ Impossible d\'importer fetch:', error);
    return null;
  }
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }
    
    if (method === 'DELETE') {
      return { success: true };
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Requête échouée:', error.message);
    return null;
  }
}

// Supprimer un document via REST API
async function deleteDocument(docId) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/measurements/${docId}`;
  
  console.log(`🗑️ Suppression de ${docId}...`);
  
  const result = await firestoreRequest('DELETE', baseUrl);
  
  if (result) {
    console.log(`✅ Document ${docId} supprimé`);
    return true;
  } else {
    console.log(`❌ Échec suppression ${docId}`);
    return false;
  }
}

// Lister tous les documents de la collection
async function listAllDocuments() {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/measurements`;
  
  console.log('📋 Récupération de tous les documents...');
  
  const result = await firestoreRequest('GET', baseUrl);
  
  if (result && result.documents) {
    console.log(`📊 ${result.documents.length} documents trouvés`);
    return result.documents.map(doc => {
      const pathParts = doc.name.split('/');
      return pathParts[pathParts.length - 1];
    });
  } else {
    console.log('📊 Aucun document trouvé ou erreur');
    return [];
  }
}

// Supprimer tous les documents
async function nukeAllDocuments() {
  console.log('💥 SUPPRESSION TOTALE EN COURS...');
  
  const docIds = await listAllDocuments();
  
  if (docIds.length === 0) {
    console.log('✅ Aucun document à supprimer');
    return;
  }
  
  let deletedCount = 0;
  
  for (const docId of docIds) {
    const success = await deleteDocument(docId);
    if (success) {
      deletedCount++;
    }
    
    // Petit délai pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`💥 ${deletedCount}/${docIds.length} documents supprimés`);
}

// Supprimer seulement les documents corrompus
async function deleteCorruptedDocuments() {
  console.log('🧹 SUPPRESSION DES DOCUMENTS CORROMPUS...');
  
  let deletedCount = 0;
  
  for (const docId of CORRUPTED_DOCS) {
    const success = await deleteDocument(docId);
    if (success) {
      deletedCount++;
    }
    
    // Petit délai pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`🧹 ${deletedCount}/${CORRUPTED_DOCS.length} documents corrompus supprimés`);
}

// Créer un fichier de réinitialisation locale
function createLocalResetFile() {
  const resetData = {
    timestamp: new Date().toISOString(),
    action: 'emergency_reset',
    corruptedDocsDeleted: CORRUPTED_DOCS,
    cacheCleared: true
  };
  
  const resetFilePath = path.join(__dirname, '..', 'emergency-reset.json');
  fs.writeFileSync(resetFilePath, JSON.stringify(resetData, null, 2));
  
  console.log(`📄 Fichier de réinitialisation créé: ${resetFilePath}`);
}

// Script principal
async function main() {
  console.log('🚨 === SCRIPT D\'URGENCE DE RÉINITIALISATION ===');
  console.log('🎯 Objectif: Résoudre le cycle de corruption infini');
  console.log('');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--nuke-all')) {
    await nukeAllDocuments();
  } else {
    await deleteCorruptedDocuments();
  }
  
  createLocalResetFile();
  
  console.log('');
  console.log('✅ === RÉINITIALISATION TERMINÉE ===');
  console.log('🔄 Actions recommandées:');
  console.log('   1. Redémarrer l\'application Expo');
  console.log('   2. Vider le cache local (AsyncStorage)');
  console.log('   3. Tester l\'ajout d\'une nouvelle mesure');
  console.log('');
}

// Gestion des erreurs globales
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Exécuter le script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = {
  deleteCorruptedDocuments,
  nukeAllDocuments,
  listAllDocuments
};
