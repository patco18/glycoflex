/**
 * Script de test pour Firebase
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import logger from "../../utils/logger";

// Configuration Firebase réelle
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Fonction de test
async function testFirebaseConnection() {
  logger.log("=== FIREBASE TEST SCRIPT ===");
  
  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    logger.log("Firebase app initialized successfully");
    
    // Initialiser Auth
    const auth = getAuth(app);
    logger.log("Firebase Auth initialized:", !!auth);
    
    // Initialiser Firestore
    const db = getFirestore(app);
    logger.log("Firebase Firestore initialized:", !!db);
    
    try {
      // Tenter de lire depuis Firestore
      logger.log("Testing Firestore read access...");
      const querySnapshot = await getDocs(collection(db, "test_collection"));
      logger.log(`Firestore query successful, found ${querySnapshot.size} documents`);
    } catch (error: any) {
      logger.log("Firestore read test failed:", error.message || String(error));
      // Les erreurs de permission sont attendues si les règles de sécurité sont configurées
      if (error.message && error.message.includes("permission-denied")) {
        logger.log("(Permission denied error is normal if security rules are set correctly)");
      }
    }
    
    logger.log("Firebase connection test completed");
  } catch (error: any) {
    console.error("Firebase initialization error:", error.message || String(error));
  }
  
  logger.log("============================");
}

// Exécution du test
testFirebaseConnection();

// Exporter pour utilisation éventuelle ailleurs
export { testFirebaseConnection };
