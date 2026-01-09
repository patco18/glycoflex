import { useEffect, useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import StorageDiagnostic from '@/components/StorageDiagnostic';

export default function StorageDiagnosticScreen() {
  const router = useRouter();
  const diagnosticsEnabled = useMemo(() => {
    return __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DIAGNOSTICS === 'true';
  }, []);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      router.replace('/welcome');
    }
  }, [diagnosticsEnabled, router]);

  if (!diagnosticsEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Accès refusé</Text>
        <Text style={styles.message}>
          Les diagnostics de stockage sont désactivés pour cet environnement.
        </Text>
      </View>
    );
  }

  return <StorageDiagnostic />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
});
