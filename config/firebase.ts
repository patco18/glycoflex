import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 🔥 CONFIGURATION FIREBASE
// =========================
// TODO: Remplacez par votre vraie configuration Firebase
// Obtenez ces valeurs depuis Firebase Console > Project Settings > Your apps

const firebaseConfig = {
  apiKey: "AIzaSyBJVgQ0mc2TLR1i3Fe9BH7n0weo89uUDAM",
  authDomain: "glycoflex-app.firebaseapp.com",
  projectId: "glycoflex-app",
  storageBucket: "glycoflex-app.firebasestorage.app",
  messagingSenderId: "906933577031",
  appId: "1:906933577031:web:ea1d777562c4bcadb89862"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore
export const db = getFirestore(app);

// Initialiser Auth avec gestion d'erreur
let auth: any;

// Désactiver tous les avertissements de Firebase Auth pour une meilleure expérience
const originalConsoleWarn = console.warn;
console.warn = function(msg: any, ...args: any[]) {
  // Ignorer les avertissements de Firebase Auth
  if (typeof msg === 'string' && 
      ((msg.includes('AsyncStorage') && msg.includes('Firebase Auth')) ||
       (msg.includes('@firebase/auth') && msg.includes('persistence')) ||
       (msg.includes('You are initializing Firebase Auth')) ||
       (msg.includes('Auth state will default to memory persistence')))) {
    // Avertissements filtrés pour une meilleure lisibilité de la console
    return;
  }
  originalConsoleWarn.apply(console, [msg, ...args]);
};

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