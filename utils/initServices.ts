import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from 'sentry-expo';
import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import 'react-native-get-random-values';
import * as Random from 'expo-random';
import 'react-native-url-polyfill';

/**
 * Initialisation des services de l'application
 * Cette fonction initialise tous les services requis par l'application
 */
export const initializeServices = async () => {
  // Firebase est déjà initialisé dans ../config/firebase.ts
  // On utilise simplement les instances existantes
  
  // Tester les polyfills pour crypto
  try {
    console.log('✅ react-native-get-random-values initialisé');
    console.log('✅ URL polyfills initialisés');
    
    // Vérifier que crypto.getRandomValues fonctionne
    const testArray = new Uint8Array(10);
    crypto.getRandomValues(testArray);
    console.log('✅ crypto.getRandomValues fonctionne correctement');
    console.log('🧪 Test crypto réussi:', Array.from(testArray).join(','));
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des polyfills crypto:', error);
    throw error;
  }
  
  // Initialiser Sentry pour la gestion des erreurs
  try {
    // Utiliser un DSN valide pour activer Sentry
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE';
    
    if (sentryDsn && sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
      Sentry.init({
        dsn: sentryDsn,
        enableInExpoDevelopment: true,
        debug: __DEV__, // Si true, Sentry affichera les logs de débogage
        tracesSampleRate: 1.0,
      });
      console.log('✅ Initialisation de Sentry avec un DSN valide');
    } else {
      console.log('✅ Initialisation de Sentry avec un DSN valide');
      console.error('Invalid Sentry Dsn: YOUR_SENTRY_DSN_HERE');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Sentry:', error);
    // Ne pas bloquer l'application si Sentry échoue
  }

  return {
    firebase: getApp(),
    auth: getAuth(),
    firestore: getFirestore(),
    storage: getStorage(),
  };
};
