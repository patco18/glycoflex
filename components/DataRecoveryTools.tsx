import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SecureCloudStorage, EncryptionService } from '@/utils/secureCloudStorage';
import { DocumentRecoveryTools } from '@/utils/documentRecovery';
import { cleanupKnownProblematicDocuments } from '@/utils/cleanupTools';

/**
 * Composant pour la gestion et réparation des données corrompues
 */
export default function DataRecoveryTools() {
  const [corruptedDocs, setCorruptedDocs] = useState<string[]>([]);
  const [ignoredDocs, setIgnoredDocs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [legacyKey, setLegacyKey] = useState('');
  const [results, setResults] = useState<string | null>(null);

  // Charger les statistiques au démarrage
  useEffect(() => {
    loadStats();
  }, []);

  // Charger les statistiques de documents problématiques
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const corrupted = SecureCloudStorage.getCorruptedDocIds();
      const ignored = await SecureCloudStorage.getIgnoredCorruptedDocIds();
      setCorruptedDocs(corrupted);
      setIgnoredDocs(ignored);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Lancer une analyse forcée des documents
  const runScan = async () => {
    setIsLoading(true);
    setResults(null);
    try {
      const scanResults = await SecureCloudStorage.forceMigrationScan();
      setResults(
        `Scan terminé:\n` +
        `- ${scanResults.totalCloud} documents au total\n` +
        `- ${scanResults.corrupted} documents corrompus\n` +
        `- ${scanResults.ignored} documents ignorés`
      );
      await loadStats(); // Recharger les statistiques
    } catch (error) {
      setResults(`Erreur lors du scan: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter une clé legacy candidate
  const addLegacyKey = async () => {
    if (!legacyKey || legacyKey.length < 8) {
      Alert.alert('Erreur', 'La clé doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);
    try {
      await EncryptionService.addLegacyKeyCandidate(legacyKey);
      setResults(`Clé legacy ajoutée avec succès`);
      setLegacyKey('');
    } catch (error) {
      setResults(`Erreur lors de l'ajout de la clé: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Tenter de réparer les documents corrompus
  const repairCorruptedDocuments = () => {
    DocumentRecoveryTools.showRepairConfirmation(
      'Réparer les documents',
      'Cette opération tentera de réparer les documents corrompus. Voulez-vous continuer ?',
      async () => {
        setIsLoading(true);
        try {
          const result = await DocumentRecoveryTools.scanAndRepairCorruptedDocuments(
            legacyKey.length >= 8 ? legacyKey : undefined
          );
          
          setResults(
            `Réparation terminée:\n` +
            `- ${result.found} documents corrompus trouvés\n` +
            `- ${result.fixed} documents réparés\n` +
            `- ${result.failed} échecs`
          );
          
          await loadStats(); // Recharger les statistiques
        } catch (error) {
          setResults(`Erreur lors de la réparation: ${error}`);
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // Nettoyer les documents problématiques
  const runCleanup = () => {
    DocumentRecoveryTools.showRepairConfirmation(
      'Nettoyage des données',
      'Cette opération supprimera définitivement les documents problématiques connus. Voulez-vous continuer ?',
      async () => {
        setIsLoading(true);
        try {
          await cleanupKnownProblematicDocuments();
          setResults('Nettoyage terminé. Vérifiez les logs pour les détails.');
          await loadStats(); // Recharger les statistiques
        } catch (error) {
          setResults(`Erreur lors du nettoyage: ${error}`);
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Outils de récupération de données</Text>
      
      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Statistiques</Text>
        <Text>Documents corrompus détectés: {corruptedDocs.length}</Text>
        <Text>Documents ignorés persistants: {ignoredDocs.length}</Text>
      </View>
      
      {/* Clé legacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clé Legacy</Text>
        <TextInput
          style={styles.input}
          placeholder="Entrez une clé d'encryption alternative"
          value={legacyKey}
          onChangeText={setLegacyKey}
          secureTextEntry={true}
        />
        <TouchableOpacity 
          style={styles.button} 
          onPress={addLegacyKey}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Ajouter la clé</Text>
        </TouchableOpacity>
      </View>
      
      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={runScan}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Analyser les documents</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={repairCorruptedDocuments}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Tenter la réparation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={runCleanup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Nettoyer les docs problématiques</Text>
        </TouchableOpacity>
      </View>
      
      {/* Résultats */}
      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Résultats</Text>
          <Text style={styles.results}>{results}</Text>
        </View>
      )}
      
      {/* Loader */}
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Opération en cours...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  results: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
