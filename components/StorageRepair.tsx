import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import StorageRepairTool from '@/utils/storageRepair';
import { EnhancedEncryptionService } from '@/utils/enhancedCrypto';
import { SecureHybridStorage } from '@/utils/secureCloudStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Composant de réparation du stockage
 */
export default function StorageRepairComponent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [actionCount, setActionCount] = useState(0);

  const resetEncryptionKey = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action');
      return;
    }

    try {
      setLoading(true);
      const result = await StorageRepairTool.repairEncryptionKey();
      setResults(result);
      setActionCount(result.actions.length);
      
      Alert.alert(
        result.success ? 'Succès' : 'Échec', 
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur s\'est produite: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const repairSynchronization = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action');
      return;
    }

    try {
      setLoading(true);
      const result = await StorageRepairTool.repairSynchronization();
      setResults(result);
      setActionCount(result.actions.length);
      
      Alert.alert(
        result.success ? 'Succès' : 'Échec', 
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur s\'est produite: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const repairAll = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action');
      return;
    }

    try {
      setLoading(true);
      const result = await StorageRepairTool.repairAll();
      setResults(result);
      setActionCount(result.actions.length);
      
      Alert.alert(
        result.success ? 'Réparation terminée' : 'Réparation partielle', 
        result.message + '\n\n' + result.actions.length + ' actions effectuées.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur s\'est produite: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outils de réparation</Text>
        <Text style={styles.subtitle}>
          Ces outils permettent de résoudre les problèmes de synchronisation et de stockage
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={resetEncryptionKey}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>Réinitialiser la clé de chiffrement</Text>
          <Text style={styles.actionDescription}>
            Résout les problèmes de chiffrement et de déchiffrement des données
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={repairSynchronization}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>Réparer la synchronisation</Text>
          <Text style={styles.actionDescription}>
            Réactive la synchronisation et résout les problèmes de connexion avec le cloud
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={repairAll}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>Réparation complète</Text>
          <Text style={styles.actionDescription}>
            Exécute toutes les réparations possibles et effectue un diagnostic complet
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a69bd" />
          <Text style={styles.loadingText}>Réparation en cours...</Text>
        </View>
      )}

      {results && !loading && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Résultats de la réparation</Text>
          <Text style={[
            styles.resultsStatus, 
            results.success ? styles.successText : styles.errorText
          ]}>
            {results.success ? '✓ Réussite' : '⚠ Échec partiel'}
          </Text>
          
          <Text style={styles.resultsSummary}>{results.message}</Text>
          
          {actionCount > 0 && (
            <>
              <Text style={styles.actionsTitle}>
                Actions effectuées ({actionCount})
              </Text>
              {results.actions?.map((action: string, index: number) => (
                <View key={index} style={styles.actionItem}>
                  <Text style={styles.actionItemBullet}>•</Text>
                  <Text style={styles.actionItemText}>{action}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#636e72',
    lineHeight: 22,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#4a69bd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636e72',
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2d3436',
  },
  resultsStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successText: {
    color: '#20bf6b',
  },
  errorText: {
    color: '#eb3b5a',
  },
  resultsSummary: {
    fontSize: 14,
    color: '#636e72',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
    color: '#2d3436',
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 4,
  },
  actionItemBullet: {
    fontSize: 16,
    color: '#4a69bd',
    marginRight: 8,
    width: 12,
  },
  actionItemText: {
    flex: 1,
    fontSize: 14,
    color: '#636e72',
  },
});
