import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './config';
import { User } from 'firebase/auth';
import logger from '../../utils/logger';

// Clés pour stocker les informations Firebase Auth
const FIREBASE_AUTH_TOKEN_KEY = 'firebase_auth_token';
const FIREBASE_AUTH_USER_KEY = 'firebase_auth_user';
const FIREBASE_REFRESH_TOKEN_KEY = 'firebase_refresh_token';

/**
 * Système personnalisé de persistence pour Firebase Auth dans React Native
 * Cette classe gère la sauvegarde et la restauration des jetons d'authentification Firebase
 * en utilisant AsyncStorage
 */
export class FirebaseAuthPersistence {
  private authStateUnsubscribe: (() => void) | null = null;
  
  /**
   * Sauvegarde les informations d'authentification Firebase après connexion
   */
  async saveAuthData(user: User) {
    try {
      if (!user) return;

      // Obtenir le jeton ID
      const token = await user.getIdToken();
      
      // Stocker le jeton et les informations utilisateur minimales
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        providerId: user.providerId,
        refreshToken: user.refreshToken
      };
      
      await Promise.all([
        AsyncStorage.setItem(FIREBASE_AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(FIREBASE_AUTH_USER_KEY, JSON.stringify(userData)),
        AsyncStorage.setItem(FIREBASE_REFRESH_TOKEN_KEY, user.refreshToken)
      ]);

      logger.log('Firebase auth data saved to AsyncStorage');
    } catch (error) {
      logger.error('Error saving Firebase auth data:', error);
    }
  }

  /**
   * Restaure l'authentification Firebase à partir des informations stockées
   * @returns {Promise<boolean>} true si l'authentification a été restaurée avec succès
   */
  async restoreAuth() {
    try {
      // Si Firebase est déjà authentifié, ne rien faire
      if (auth.currentUser) {
        logger.log('User already authenticated, no need to restore');
        return true;
      }
      
      const token = await AsyncStorage.getItem(FIREBASE_AUTH_TOKEN_KEY);
      
      if (!token) {
        logger.log('No saved Firebase auth token found');
        return false;
      }

      // Pour Firebase 12, la persistence automatique est gérée par la SDK
      // Cette fonction est désormais plus pour la compatibilité et le logging
      logger.log('Auth state is being handled by Firebase SDK with AsyncStorage');
      
      return true;
    } catch (error) {
      logger.error('Error restoring Firebase auth:', error);
      return false;
    }
  }

  /**
   * Supprime les jetons d'authentification stockés (lors de la déconnexion)
   */
  async clearAuthData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(FIREBASE_AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(FIREBASE_AUTH_USER_KEY),
        AsyncStorage.removeItem(FIREBASE_REFRESH_TOKEN_KEY)
      ]);
      logger.log('Firebase auth data cleared from AsyncStorage');
    } catch (error) {
      logger.error('Error clearing Firebase auth data:', error);
    }
  }

  /**
   * Configure les listeners pour sauvegarder automatiquement les infos
   * d'authentification après connexion/déconnexion
   */
  setupAuthChangeListeners() {
    // Nettoyage du précédent listener si nécessaire
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
    }
    
    // Mettre en place un nouveau listener
    this.authStateUnsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        // L'utilisateur vient de se connecter, sauvegardez ses données
        this.saveAuthData(user);
      } else {
        // L'utilisateur s'est déconnecté, effacez les données
        this.clearAuthData();
      }
    });
    
    return () => {
      if (this.authStateUnsubscribe) {
        this.authStateUnsubscribe();
        this.authStateUnsubscribe = null;
      }
    };
  }
}

// Exporter une instance singleton
export const firebaseAuthPersistence = new FirebaseAuthPersistence();

/**
 * Configure la persistence de l'authentification Firebase
 * Appelez cette fonction au démarrage de l'application
 */
export function setupFirebaseAuthPersistence() {
  logger.log('Initializing Firebase Auth persistence from auth-persistence.ts');
  // Configurer les listeners d'authentification
  const cleanupListeners = firebaseAuthPersistence.setupAuthChangeListeners();
  
  // Tenter de restaurer l'authentification si elle existe
  return firebaseAuthPersistence.restoreAuth()
    .then(result => {
      logger.log('Firebase Auth persistence initialized with AsyncStorage');
      return result;
    });
}

// Exporting the class for potential extensions
export default FirebaseAuthPersistence;
