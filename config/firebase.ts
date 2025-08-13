import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 🔥 CONFIGURATION FIREBASE
// =========================
// Les valeurs sont lues depuis les variables d'environnement.
// Assurez-vous de définir ces variables dans un fichier `.env` (préfixe EXPO_PUBLIC_).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore
export const db = getFirestore(app);

// Initialiser Auth avec gestion d'erreur
let auth: any;

try {
  if (Platform.OS === 'web') {
    // Pour le Web - Configuration synchrone
    const { getAuth, browserLocalPersistence, setPersistence } = require('firebase/auth');
    auth = getAuth(app);
    
    // Configurer la persistance pour le Web
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('✅ Firebase Auth initialisé avec persistance locale pour le Web');
      })
      .catch((error: any) => {
        console.error('🔥 Erreur lors de la configuration de la persistance:', error);
      });
  } else {
    // Pour les plateformes mobiles
    try {
      const firebaseAuth = require('firebase/auth');
      
      if (firebaseAuth.getReactNativePersistence) {
        // Utiliser la méthode officielle pour React Native (Firebase v9+)
        auth = initializeAuth(app, {
          persistence: firebaseAuth.getReactNativePersistence(AsyncStorage)
        });
        console.log('✅ Firebase Auth initialisé avec persistance React Native officielle');
      } else {
        // Fallback à la méthode standard
        auth = getAuth(app);
        
        // Création d'une couche de persistance manuelle
        auth.onIdTokenChanged(async (user: any) => {
          if (user) {
            try {
              // Sauvegarder manuellement les tokens d'authentification
              await AsyncStorage.setItem('firebase_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: user.metadata?.creationTime,
                lastLoginAt: user.metadata?.lastSignInTime
              }));
              const token = await user.getIdToken();
              await AsyncStorage.setItem('firebase_auth_token', token);
            } catch (error) {
              console.warn('Erreur lors de la sauvegarde des données d\'authentification:', error);
            }
          } else {
            // Effacer les données d'authentification en cas de déconnexion
            await AsyncStorage.removeItem('firebase_user');
            await AsyncStorage.removeItem('firebase_auth_token');
          }
        });
        
        console.log('✅ Firebase Auth initialisé avec persistance manuelle via AsyncStorage');
      }
      
      // Conserver la logique de sauvegarde manuelle comme filet de sécurité
      auth.onAuthStateChanged(async (user: any) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            await AsyncStorage.setItem('firebase_auth_token', token);
            await AsyncStorage.setItem('firebase_user_id', user.uid);
            console.log('✅ Token d\'authentification sauvegardé localement');
          } catch (error) {
            console.warn('Erreur persistance supplémentaire:', error);
          }
        }
      });
    } catch (error) {
      console.warn('Erreur initializeAuth avec AsyncStorage:', error);
      // Fallback au comportement par défaut
      auth = getAuth(app);
    }
  }
} catch (error: any) {
  // Si l'auth est déjà initialisée ou en cas d'erreur
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error('Erreur Firebase Auth:', error);
    auth = getAuth(app);
  }
}

export { auth };
export default app;

// Log de vérification
console.log('🔥 Firebase configuré pour le projet:', firebaseConfig.projectId);
