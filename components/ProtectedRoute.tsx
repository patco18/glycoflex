import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inWelcome = segments[0] === 'welcome';
    const inTabs = segments[0] === '(tabs)';

    if (!user && !inAuthGroup && !inWelcome && inTabs) {
      // Utilisateur non connecté essayant d'accéder aux tabs, rediriger vers welcome
      router.replace('/welcome');
    } else if (user && (inAuthGroup || inWelcome)) {
      // Utilisateur connecté sur auth ou welcome, rediriger vers l'app
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return { user, loading };
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useProtectedRoute();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667EEA" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
