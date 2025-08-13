import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useCloudSync } from '@/hooks/useCloudSync';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { initializeAppServices } from '@/utils/initServices';
import { initializeCryptoPolyfills, testCryptoPolyfills } from '@/utils/cryptoInit';
import { StorageManager } from '@/utils/storageManager';
import '@/utils/i18n'; // Initialiser i18n
import { ThemeProvider } from '@/theme';

// Initialiser les polyfills crypto dès que possible AVANT tous les autres imports
initializeCryptoPolyfills();

// Tester que les polyfills fonctionnent
if (Platform.OS !== 'web') {
  const cryptoWorking = testCryptoPolyfills();
  if (!cryptoWorking) {
    console.warn('⚠️ Les polyfills crypto ne fonctionnent pas correctement');
  }
}

function AppContent() {
  // Initialiser la synchronisation cloud automatiquement
  useCloudSync();
  
  // Initialiser le gestionnaire de stockage unifié
  useEffect(() => {
    StorageManager.initialize()
      .catch((err: any) => console.debug('Erreur initialisation StorageManager:', err));
  }, []);
  
  return (
    <ProtectedRoute>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="storage-diagnostic" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ProtectedRoute>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  
  // Uniquement pour le web
  useFrameworkReady();

  useEffect(() => {
    async function prepareApp() {
      try {
        await initializeAppServices();
        setIsReady(true);
      } catch (error) {
        console.error('Erreur lors de la préparation de l\'application:', error);
        setIsReady(true); // Continuer malgré l'erreur
      }
    }
    
    prepareApp();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#1EB4B4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}