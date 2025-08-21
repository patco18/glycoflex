import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import KeyRepair from '@/components/KeyRepair';
import { useProtectedRoute } from '@/components/ProtectedRoute';

export default function KeyRepairPage() {
  // S'assurer que l'utilisateur est connecté
  useProtectedRoute();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <KeyRepair />
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
