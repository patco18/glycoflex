import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import StorageRepair from '@/components/StorageRepair';
import { useProtectedRoute } from '@/components/ProtectedRoute';

export default function RepairPage() {
  // Utiliser le hook de protection pour s'assurer que l'utilisateur est connecté
  useProtectedRoute();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <StorageRepair />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
});
