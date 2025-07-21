import { getApps, getApp, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Configuration Firebase
// Données de configuration Firebase pour votre application
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialisation de Firebase avec gestion d'erreurs robuste
let app;
try {
  if (getApps().length === 0) {
    console.log('Initializing Firebase for the first time in config.ts');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('Using existing Firebase app in config.ts');
    app = getApp();
  }
} catch (error) {
  console.error('Error during Firebase initialization in config.ts:', error);
  // En cas d'erreur, essayer encore une fois d'initialiser
  try {
    app = initializeApp(firebaseConfig);
    console.log('Second attempt to initialize Firebase successful');
  } catch (innerError) {
    console.error('Second attempt at Firebase initialization failed:', innerError);
    throw new Error('Firebase initialization failed completely. Check network and credentials.');
  }
}

// Initialisation de Firebase Auth standard avec la meilleure persistence disponible
const auth = getAuth(app);

// Configurer la persistence en fonction de la plateforme
try {
  // Sur le web, on peut utiliser la persistence locale du navigateur
  if (Platform.OS === 'web') {
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log('Firebase Auth initialized with browser persistence'))
      .catch(error => console.error('Error setting auth persistence:', error));
  } else {
    // Sur mobile, nous utilisons notre propre mécanisme de persistance via AsyncStorage
    // car la persistence native n'est pas bien supportée dans Firebase v12
    setPersistence(auth, inMemoryPersistence)
      .then(() => console.log('Firebase Auth initialized with in-memory persistence (custom persistence via AsyncStorage will be used)'))
      .catch(error => console.error('Error setting auth persistence:', error));
  }
} catch (error) {
  console.error('Error configuring auth persistence:', error);
}

console.log('Firebase Auth initialized. Using custom persistence with AsyncStorage from auth-persistence.ts');

// Initialisation de Firestore et Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
