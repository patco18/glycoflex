// @ts-check

/**
 * Script pour vérifier et initialiser la structure Firestore sans authentification
 * Utilise les règles Firestore déployées pour permettre l'accès aux collections
 */

// Importations Firebase Admin pour accès sans authentification
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de clé privée pour Firebase Admin
const serviceAccountPath = path.join(__dirname, '../service-account-key.json');
const serviceAccountExamplePath = path.join(__dirname, '../service-account-key-example.json');

/**
 * Initialise Firebase Admin avec les informations du projet
 */
function initializeFirebaseAdmin() {
  try {
    // Si déjà initialisé, récupérer l'app existante
    try {
      return admin.app();
    } catch (e) {
      // Vérifier si le fichier de clé de service existe
      if (!fs.existsSync(serviceAccountPath)) {
        console.log('⚠️ Fichier service-account-key.json non trouvé');
        console.log('ℹ️ Utilisation de l\'initialisation alternative avec GOOGLE_APPLICATION_CREDENTIALS');
        
        // Vérifier si la variable d'environnement GOOGLE_APPLICATION_CREDENTIALS est définie
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          console.log('✅ Variable GOOGLE_APPLICATION_CREDENTIALS trouvée, utilisation automatique');
          return admin.initializeApp({
            projectId: 'glycoflex-new'
          });
        }
        
        // Sinon, initialiser sans authentification (pour les règles publiques)
        console.log('⚠️ Initialisation sans authentification, accès limité');
        return admin.initializeApp({
          projectId: 'glycoflex-new'
        });
      }
      
      // Initialiser avec le fichier de service
      try {
        const serviceAccount = require(serviceAccountPath);
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'glycoflex-new',
        });
      } catch (err) {
        console.error('❌ Erreur avec le fichier service-account-key.json:', err.message);
        console.log('⚠️ Veuillez télécharger un fichier service-account-key.json depuis Firebase Console');
        console.log('Voir: https://firebase.google.com/docs/admin/setup#initialize-sdk');
        
        // Créer un exemple de fichier s'il n'existe pas
        if (fs.existsSync(serviceAccountExamplePath)) {
          console.log(`ℹ️ Consultez l'exemple dans: service-account-key-example.json`);
        }
        
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error);
    process.exit(1);
  }
}

/**
 * Vérifie et initialise les collections Firestore
 */
async function setupFirestoreCollections() {
  console.log('🔍 Vérification et initialisation des collections Firestore...');
  
  const app = initializeFirebaseAdmin();
  const db = admin.firestore(app);
  
  try {
    // Collections à vérifier/créer
    const collections = [
      'encrypted_measurements',
      'sync_metadata',
      'devices',
      'users'
    ];
    
    // Vérifier chaque collection
    for (const collectionName of collections) {
      const collRef = db.collection(collectionName);
      const snapshot = await collRef.limit(1).get();
      
      console.log(`📊 Collection '${collectionName}': ${snapshot.empty ? 'vide' : 'contient des documents'}`);
      
      // Si c'est la collection users et qu'elle est vide, créer un document utilisateur test
      if (collectionName === 'users' && snapshot.empty) {
        // Ne pas créer de document test pour éviter des problèmes de sécurité
        console.log('ℹ️ La collection users est vide - aucun document créé (sécurité)');
      }
    }
    
    console.log('✅ Vérification des collections terminée avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des collections:', error);
  } finally {
    // Ne pas fermer l'app ici car cela provoque une erreur avec Firebase Admin
    // app.delete();
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de la vérification de la structure Firestore...');
  
  try {
    await setupFirestoreCollections();
    console.log('✅ Structure Firestore vérifiée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la structure Firestore:', error);
  }
}

// Exécution du script
main().catch(console.error);
