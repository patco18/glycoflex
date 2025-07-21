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

/**
 * Fonction de diagnostic avancé pour Firebase
 * Vérifie la configuration, la connectivité et résout les problèmes courants
 */
export async function runFirebaseDiagnostic() {
  console.log('====== STARTING FIREBASE DIAGNOSTIC ======');
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
    console.log('Firebase Auth initialized:', diagnosticResults.authInitialized);

    // 2. Vérification de l'état de connexion
    diagnosticResults.userSignedIn = !!auth.currentUser;
    console.log('User signed in:', diagnosticResults.userSignedIn);
    
    if (auth.currentUser) {
      console.log('Current user ID:', auth.currentUser.uid);
      console.log('Current user email:', auth.currentUser.email);
      console.log('Current user provider ID:', auth.currentUser.providerId);
    }

    // 3. Vérification de la persistence
    const storedAuth = await AsyncStorage.getItem('firebase_auth_user');
    diagnosticResults.persistenceWorking = !!storedAuth;
    console.log('Persistence data found:', diagnosticResults.persistenceWorking);

    // 4. Vérification de Firestore
    diagnosticResults.firestoreInitialized = !!db;
    console.log('Firestore initialized:', diagnosticResults.firestoreInitialized);

    // 5. Test de connexion Firestore
    try {
      const testQuery = query(collection(db, '_test_'), limit(1));
      await getDocs(testQuery);
      diagnosticResults.firestoreConnected = true;
      console.log('Firestore connection test: SUCCESS');
    } catch (error) {
      const fbError = error as FirebaseError;
      diagnosticResults.firestoreConnected = false;
      console.log('Firestore connection test: FAILED', fbError.message);
      
      // Les erreurs de permission sont normales avec des règles de sécurité correctes
      if (fbError.message.includes('permission-denied')) {
        console.log('(Permission denied error is expected if security rules are set)');
      } else {
        diagnosticResults.errors.push(`Firestore connection error: ${fbError.message}`);
      }
    }

    // 6. Tenter de fixer les problèmes
    if (!diagnosticResults.userSignedIn) {
      console.log('Attempting anonymous sign-in to test connectivity...');
      try {
        await signInAnonymously(auth);
        diagnosticResults.fixes.push('Successfully signed in anonymously');
        console.log('Anonymous sign-in successful');
      } catch (error) {
        const fbError = error as FirebaseError;
        diagnosticResults.errors.push(`Anonymous sign-in failed: ${fbError.message}`);
        console.log('Anonymous sign-in failed:', fbError.message);
      }
    }

  } catch (error) {
    const err = error as Error;
    diagnosticResults.errors.push(`General diagnostic error: ${err.message}`);
    console.error('Firebase diagnostic error:', err);
  }

  console.log('====== FIREBASE DIAGNOSTIC SUMMARY ======');
  console.log('Auth initialized:', diagnosticResults.authInitialized);
  console.log('Firestore initialized:', diagnosticResults.firestoreInitialized);
  console.log('User signed in:', diagnosticResults.userSignedIn);
  console.log('Firestore connected:', diagnosticResults.firestoreConnected);
  console.log('Persistence working:', diagnosticResults.persistenceWorking);
  
  if (diagnosticResults.errors.length) {
    console.log('Errors found:');
    diagnosticResults.errors.forEach(err => console.log(`- ${err}`));
  }
  
  if (diagnosticResults.fixes.length) {
    console.log('Fixes applied:');
    diagnosticResults.fixes.forEach(fix => console.log(`- ${fix}`));
  }
  
  console.log('======================================');
  
  return diagnosticResults;
}
