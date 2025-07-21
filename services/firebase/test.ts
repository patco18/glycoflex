/**
 * Script de test pour Firebase
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuration Firebase réelle
const firebaseConfig = {
  apiKey: "AIzaSyDosaROb-vr8AsZJbuzTDVU46xKtSYWfnQ",
  authDomain: "glucose-insights-5moiz.firebaseapp.com",
  projectId: "glucose-insights-5moiz",
  storageBucket: "glucose-insights-5moiz.firebasestorage.app",
  messagingSenderId: "297314942712",
  appId: "1:297314942712:web:3e84cf0021d5860195050d"
};

// Fonction de test
async function testFirebaseConnection() {
  console.log("=== FIREBASE TEST SCRIPT ===");
  
  try {
    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully");
    
    // Initialiser Auth
    const auth = getAuth(app);
    console.log("Firebase Auth initialized:", !!auth);
    
    // Initialiser Firestore
    const db = getFirestore(app);
    console.log("Firebase Firestore initialized:", !!db);
    
    try {
      // Tenter de lire depuis Firestore
      console.log("Testing Firestore read access...");
      const querySnapshot = await getDocs(collection(db, "test_collection"));
      console.log(`Firestore query successful, found ${querySnapshot.size} documents`);
    } catch (error: any) {
      console.log("Firestore read test failed:", error.message || String(error));
      // Les erreurs de permission sont attendues si les règles de sécurité sont configurées
      if (error.message && error.message.includes("permission-denied")) {
        console.log("(Permission denied error is normal if security rules are set correctly)");
      }
    }
    
    console.log("Firebase connection test completed");
  } catch (error: any) {
    console.error("Firebase initialization error:", error.message || String(error));
  }
  
  console.log("============================");
}

// Exécution du test
testFirebaseConnection();

// Exporter pour utilisation éventuelle ailleurs
export { testFirebaseConnection };
