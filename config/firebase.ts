import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth } from '@/utils/internalAuth';

// Helper pour récupérer les variables d'environnement avec message d'erreur clair
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Verify your .env configuration.`);
  }
  return value;
}

// 🔥 CONFIGURATION FIREBASE
// =========================
// Configuration Firebase pour le nouveau projet

import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId: getEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID')
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
// Initialiser Analytics uniquement sur les plateformes qui le prennent en charge
let analytics;
if (Platform.OS === 'web') {
  analytics = getAnalytics(app);
}


// Initialiser Firestore
export const db = getFirestore(app);

export { auth };
export default app;

// Log de vérification
console.log('🔥 Firebase configuré pour le projet:', firebaseConfig.projectId);
