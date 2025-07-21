/**
 * Utilitaire de diagnostic pour Firebase
 */

import { auth, db } from './config';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import logger from '../../utils/logger';

/**
 * Vérifie la configuration Firebase et affiche des informations de diagnostic
 */
export function verifyFirebaseSetup() {
  logger.log('=============== FIREBASE DIAGNOSTIC ===============');
  
  // Vérifier l'initialisation de Firebase Auth
  try {
    logger.log('Firebase Auth initialized:', !!auth);
    logger.log('Current user:', auth.currentUser ? 'Logged in' : 'Not logged in');
  } catch (error) {
    console.error('Firebase Auth error:', error);
  }
  
  // Vérifier l'initialisation de Firestore
  try {
    logger.log('Firestore initialized:', !!db);
    
    // Tester une requête simple pour vérifier la connexion
    const q = query(collection(db, '_test_'), limit(1));
    getDocs(q)
      .then(() => {
        logger.log('Firestore connection test: SUCCESS');
      })
      .catch(error => {
        logger.log('Firestore connection test: FAILED', error.message);
        // Les erreurs de permission sont normales si les règles de sécurité sont configurées
        if (error.message.includes('permission-denied')) {
          logger.log('(Permission denied error is expected if security rules are set properly)');
        }
      });
  } catch (error) {
    console.error('Firestore error:', error);
  }
  
  logger.log('==================================================');
}
