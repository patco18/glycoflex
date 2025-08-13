import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CorruptedDocumentsManager from '@/components/CorruptedDocumentsManager';

/**
 * Écran de diagnostic pour gérer les documents corrompus
 */
export default function CorruptedDocumentsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Documents Corrompus',
          headerShown: true,
          headerTintColor: '#FFFFFF',
          headerStyle: {
            backgroundColor: '#667EEA',
          },
        }}
      />

      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text style={styles.description}>
              Cette page permet de visualiser et de gérer les documents corrompus détectés dans le stockage cloud.
              Vous pouvez supprimer les documents problématiques pour résoudre les erreurs de synchronisation.
            </Text>
            
            <View style={styles.managerContainer}>
              <CorruptedDocumentsManager />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667EEA',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  managerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 400,
  },
});
