import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
// Remove problematic import
import firebaseConfig from '../../config/app';
import logger from '../../utils/logger';

/**
 * Configure l'authentification Firebase avec persistence pour React Native
 * Cette fonction devrait être appelée au démarrage de l'application
 */
export const configureFirebaseAuth = () => {
  // Initialise l'application Firebase si elle n'existe pas déjà
  let app;
  try {
    app = initializeApp(firebaseConfig.firebase);
  } catch (error) {
    logger.warn("Firebase already initialized, using existing instance");
    // L'application est déjà initialisée, probablement dans config.ts
    return;
  }

  try {
    // Créer une solution personnalisée pour la persistence
    // Dans Firebase v12, le module react-native pour persistance n'est pas disponible directement
    const customPersistence = {
      type: 'NONE', // Type standard pour Firebase Auth
      storage: AsyncStorage, // Utiliser AsyncStorage comme mécanisme de stockage
    };
    
    // Initialiser l'authentification avec une configuration personnalisée
    const auth = initializeAuth(app, {
      persistence: browserLocalPersistence // Utiliser la persistance du navigateur comme fallback
    });
    return auth;
  } catch (error) {
    logger.error("Failed to initialize Firebase Auth with persistence:", error);
    // En cas d'échec, revenir à l'authentification standard
    return getAuth(app);
  }
};
