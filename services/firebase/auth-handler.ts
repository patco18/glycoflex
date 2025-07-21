/**
 * Gestionnaire de persistance Firebase Auth pour React Native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './config';
import logger from '../../utils/logger';

// Clés pour le stockage
const AUTH_USER_KEY = 'firebase_auth_user';
const AUTH_TOKEN_KEY = 'firebase_auth_token';

// Import the persistence handler from auth-persistence.ts
import { setupFirebaseAuthPersistence as setupPersistence } from './auth-persistence';

/**
 * Configure la persistence pour Firebase Auth en utilisant AsyncStorage
 * @returns {Promise<boolean>} - Indique si une session a été restaurée
 */
export async function setupFirebaseAuthPersistence() {
  // Use the implementation from auth-persistence.ts
  return setupPersistence();
}

// Keep this for backward compatibility, but we'll use the implementation from auth-persistence
const setupAuthListener = async () => {
  // Configurer l'écouteur d'authentification pour sauvegarder les données utilisateur
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        // Sauvegarder les données utilisateur et le token
        const token = await user.getIdToken();
        const userData = JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        
        await AsyncStorage.setItem(AUTH_USER_KEY, userData);
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        logger.log('Firebase Auth data saved to AsyncStorage');
      } catch (error) {
        console.error('Error saving auth data to AsyncStorage:', error);
      }
    } else {
      // Effacer les données lors de la déconnexion
      try {
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        logger.log('Firebase Auth data cleared from AsyncStorage');
      } catch (error) {
        console.error('Error clearing auth data from AsyncStorage:', error);
      }
    }
  });
  
  // Vérifier si nous avons des données stockées
  try {
    const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
    return !!userData; // Retourne true si des données utilisateur existent
  } catch (error) {
    console.error('Error checking for stored auth data:', error);
    return false;
  }
}
