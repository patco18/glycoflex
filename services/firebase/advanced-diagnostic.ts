/**
 * Utilitaire avancé de diagnostic Firebase pour l'application
 * Ce module permet d'identifier et de résoudre les problèmes courants avec Firebase
 */

import { auth, db } from './config';
import { FirebaseError } from 'firebase/app';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseAuthPersistence } from './auth-persistence';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../../utils/logger';

/**
 * Fonction de diagnostic avancé pour Firebase
 * Vérifie la configuration, la connectivité et résout les problèmes courants
 */
export async function runFirebaseDiagnostic() {
  logger.log('====== STARTING FIREBASE DIAGNOSTIC ======');
  const diagnosticResults = {
    authInitialized: false,
    firestoreInitialized: false,
    userSignedIn: false,
    firestoreConnected: false,
    persistenceWorking: false,
    errors: [] as string[],
    fixes: [] as string[],
  };

  try {
    // 1. Vérification de l'initialisation de Firebase Auth
    diagnosticResults.authInitialized = !!auth;
    logger.log('Firebase Auth initialized:', diagnosticResults.authInitialized);

    // 2. Vérification de l'état de connexion
    diagnosticResults.userSignedIn = !!auth.currentUser;
    logger.log('User signed in:', diagnosticResults.userSignedIn);
    
    if (auth.currentUser) {
      logger.log('Current user ID:', auth.currentUser.uid);
      logger.log('Current user email:', auth.currentUser.email);
      logger.log('Current user provider ID:', auth.currentUser.providerId);
    }

    // 3. Vérification de la persistence
    const storedAuth = await AsyncStorage.getItem('firebase_auth_user');
    diagnosticResults.persistenceWorking = !!storedAuth;
    logger.log('Persistence data found:', diagnosticResults.persistenceWorking);

    // 4. Vérification de Firestore
    diagnosticResults.firestoreInitialized = !!db;
    logger.log('Firestore initialized:', diagnosticResults.firestoreInitialized);

    // 5. Test de connexion Firestore
    try {
      const testQuery = query(collection(db, '_test_'), limit(1));
      await getDocs(testQuery);
      diagnosticResults.firestoreConnected = true;
      logger.log('Firestore connection test: SUCCESS');
    } catch (error) {
      const fbError = error as FirebaseError;
      diagnosticResults.firestoreConnected = false;
      logger.log('Firestore connection test: FAILED', fbError.message);
      
      // Les erreurs de permission sont normales avec des règles de sécurité correctes
      if (fbError.message.includes('permission-denied')) {
        logger.log('(Permission denied error is expected if security rules are set)');
      } else {
        diagnosticResults.errors.push(`Firestore connection error: ${fbError.message}`);
      }
    }

    // 6. Tenter de fixer les problèmes
    if (!diagnosticResults.userSignedIn) {
      logger.log('Attempting anonymous sign-in to test connectivity...');
      try {
        await signInAnonymously(auth);
        diagnosticResults.fixes.push('Successfully signed in anonymously');
        logger.log('Anonymous sign-in successful');
      } catch (error) {
        const fbError = error as FirebaseError;
        diagnosticResults.errors.push(`Anonymous sign-in failed: ${fbError.message}`);
        logger.log('Anonymous sign-in failed:', fbError.message);
      }
    }

  } catch (error) {
    const err = error as Error;
    diagnosticResults.errors.push(`General diagnostic error: ${err.message}`);
    console.error('Firebase diagnostic error:', err);
  }

  logger.log('====== FIREBASE DIAGNOSTIC SUMMARY ======');
  logger.log('Auth initialized:', diagnosticResults.authInitialized);
  logger.log('Firestore initialized:', diagnosticResults.firestoreInitialized);
  logger.log('User signed in:', diagnosticResults.userSignedIn);
  logger.log('Firestore connected:', diagnosticResults.firestoreConnected);
  logger.log('Persistence working:', diagnosticResults.persistenceWorking);
  
  if (diagnosticResults.errors.length) {
    logger.log('Errors found:');
    diagnosticResults.errors.forEach(err => logger.log(`- ${err}`));
  }
  
  if (diagnosticResults.fixes.length) {
    logger.log('Fixes applied:');
    diagnosticResults.fixes.forEach(fix => logger.log(`- ${fix}`));
  }
  
  logger.log('======================================');
  
  return diagnosticResults;
}
