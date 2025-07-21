import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, AppState } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AppProviders } from '@/contexts/AppProviders';
import { setupFirebaseAuthPersistence } from '@/services/firebase/auth-handler';
import { verifyFirebaseSetup } from '@/services/firebase/diagnostic';
import logger from '@/utils/logger';
import {
  setupAndroidNotificationChannels,
  optimizeAndroidPerformance,
  handleAndroidAppState,
  setupAndroidBackHandler
} from '@/utils/androidOptimizations';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Vérification de la configuration Firebase
    try {
      verifyFirebaseSetup();
    } catch (error) {
      logger.error('Firebase verification failed:', error);
    }
    
    // Configuration de la persistence Firebase Auth
    setupFirebaseAuthPersistence()
      .then(restored => {
        logger.log('Firebase Auth persistence setup completed:', restored ? 'session restored' : 'no session to restore');
      })
      .catch(error => {
        console.warn('Error setting up Firebase Auth persistence:', error);
      });
      
    // Configuration spécifique Android
    if (Platform.OS === 'android') {
      setupAndroidNotificationChannels();
      optimizeAndroidPerformance();

      // Gestion de l'état de l'application
      const handleAppStateChange = (nextAppState: string) => {
        handleAndroidAppState(nextAppState);
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      // Configuration du bouton retour Android
      const backHandlerCleanup = setupAndroidBackHandler();

      return () => {
        subscription.remove();
        if (backHandlerCleanup) backHandlerCleanup();
      };
    }
  }, []);

  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#F8F9FA',
          },
        }}
      />
    </AppProviders>
  );
}
