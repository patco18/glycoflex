import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { SettingsProvider } from '@/contexts/SettingsContext';
import '@/utils/i18n'; // Initialiser i18n

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SettingsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </SettingsProvider>
  );
}