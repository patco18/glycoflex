// INSTRUCTIONS DE CONFIGURATION FIREBASE
// =====================================
// 
// 1. Remplacez les valeurs ci-dessous par celles de votre projet Firebase
// 2. Vous les obtenez depuis Firebase Console > Project Settings > Your apps > Web app
// 3. Ne commitez jamais ce fichier avec de vraies clés en production !

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// TODO: Remplacez par votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBJVgQ0mc2TLR1i3Fe9BH7n0weo89uUDAM",
  authDomain: "glycoflex-app.firebaseapp.com",
  projectId: "glycoflex-app",
  storageBucket: "glycoflex-app.firebasestorage.app",
  messagingSenderId: "906933577031",
  appId: "1:906933577031:web:ea1d777562c4bcadb89862"
};

// Vérification que la configuration a été mise à jour
if (firebaseConfig.apiKey === "VOTRE_API_KEY") {
  console.error("❌ ERREUR: Vous devez configurer Firebase !");
  console.error("📝 Suivez les instructions dans config/firebase.ts");
  console.error("🔧 Remplacez les valeurs par celles de votre projet Firebase");
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore
export const db = getFirestore(app);

// Initialiser Auth avec persistance pour React Native
let auth: any;

try {
  if (Platform.OS !== 'web') {
    // Pour React Native - utiliser initializeAuth avec AsyncStorage
    // Note: Dans Firebase v9+, la persistance AsyncStorage est automatique pour React Native
    auth = initializeAuth(app, {
      // La persistance AsyncStorage est gérée automatiquement par Firebase
    });
  } else {
    // Pour Web - utiliser getAuth standard
    auth = getAuth(app);
  }
} catch (error: any) {
  // Si l'auth est déjà initialisée, utiliser getAuth
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error('Erreur d\'initialisation Firebase Auth:', error);
    auth = getAuth(app);
  }
}

export { auth };
export default app;

// Vérification de la configuration
console.log('🔥 Firebase initialisé:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});
