import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import AdvancedKeyRepair from '@/utils/advancedKeyRepair';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_REPAIR_KEY = 'last_key_repair_timestamp';

/**
 * Composant pour la réparation avancée des clés de chiffrement
 */
export default function KeyRepairScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [lastRepair, setLastRepair] = useState<string | null>(null);
  const [repairResults, setRepairResults] = useState<{
    success: boolean;
    actions: string[];
    message: string;
  } | null>(null);

  useEffect(() => {
    const checkKeyAndLastRepair = async () => {
      // Tester la clé de chiffrement actuelle
      const result = await AdvancedKeyRepair.testEncryptionKey();
      setKeyTestResult(result);

      // Récupérer le timestamp de la dernière réparation
      const timestamp = await AsyncStorage.getItem(LAST_REPAIR_KEY);
      if (timestamp) {
        const date = new Date(parseInt(timestamp, 10));
        setLastRepair(date.toLocaleString());
      }
    };

    if (user) {
      checkKeyAndLastRepair();
    }
  }, [user]);

  const handleFullReset = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action');
      return;
    }

    Alert.alert(
      'Réinitialisation complète',
      'Cette action va réinitialiser complètement les clés de chiffrement et nettoyer les données corrompues. Voulez-vous continuer ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await AdvancedKeyRepair.fullKeyReset();
              setRepairResults(result);
              
              // Enregistrer le timestamp de la réparation
              await AsyncStorage.setItem(LAST_REPAIR_KEY, Date.now().toString());
              setLastRepair(new Date().toLocaleString());
              
              // Retester la clé
              const keyTest = await AdvancedKeyRepair.testEncryptionKey();
              setKeyTestResult(keyTest);

              Alert.alert(
                result.success ? 'Réparation réussie' : 'Réparation partielle',
                result.message,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert(
                'Erreur',
                `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Réparation avancée des clés</Text>
        <Text style={styles.subtitle}>
          Cet outil résout les problèmes de chiffrement et supprime les données corrompues
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>État de la clé de chiffrement</Text>
        
        {keyTestResult ? (
          <View style={[
            styles.statusBox,
            keyTestResult.valid ? styles.statusBoxValid : styles.statusBoxInvalid
          ]}>
            <Text style={styles.statusIcon}>
              {keyTestResult.valid ? '✓' : '⚠️'}
            </Text>
            <Text style={styles.statusText}>
              {keyTestResult.valid
                ? 'La clé de chiffrement fonctionne correctement'
                : 'Problème détecté avec la clé de chiffrement'}
            </Text>
            <Text style={styles.statusMessage}>{keyTestResult.message}</Text>
          </View>
        ) : (
          <Text style={styles.statusPending}>Vérification de la clé...</Text>
        )}

        {lastRepair && (
          <Text style={styles.lastRepairText}>
            Dernière réparation: {lastRepair}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.actionButtonDisabled]}
        onPress={handleFullReset}
        disabled={loading}
      >
        <Text style={styles.actionButtonText}>
          Réinitialisation complète des clés
        </Text>
        <Text style={styles.actionDescription}>
          Génère une nouvelle clé de chiffrement et nettoie les données corrompues
        </Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a69bd" />
          <Text style={styles.loadingText}>
            Réparation en cours, veuillez patienter...
          </Text>
        </View>
      )}

      {repairResults && !loading && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Résultats de la réparation</Text>
          
          <Text style={[
            styles.resultsStatus,
            repairResults.success ? styles.successText : styles.errorText
          ]}>
            {repairResults.success ? '✓ Réussite' : '⚠️ Échec partiel'}
          </Text>
          
          <Text style={styles.resultsSummary}>{repairResults.message}</Text>
          
          {repairResults.actions.length > 0 && (
            <>
              <Text style={styles.actionsTitle}>
                Actions effectuées ({repairResults.actions.length})
              </Text>
              
              {repairResults.actions.map((action, index) => (
                <View key={index} style={styles.actionItem}>
                  <Text style={styles.actionItemBullet}>•</Text>
                  <Text style={styles.actionItemText}>{action}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>⚠️ Important</Text>
        <Text style={styles.warningText}>
          Cette réparation va réinitialiser complètement votre clé de chiffrement. 
          Les données locales seront préservées, mais les données cloud corrompues seront supprimées.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  statusContainer: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2d3436',
  },
  statusBox: {
    borderRadius: 6,
    padding: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBoxValid: {
    backgroundColor: 'rgba(32, 191, 107, 0.15)',
  },
  statusBoxInvalid: {
    backgroundColor: 'rgba(235, 59, 90, 0.15)',
  },
  statusIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#636e72',
  },
  statusPending: {
    fontSize: 16,
    color: '#636e72',
    fontStyle: 'italic',
  },
  lastRepairText: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#4a69bd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  actionButtonDisabled: {
    opacity: 0.6,
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
    marginBottom: 24,
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
  warningContainer: {
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.3)',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#e17055',
  },
  warningText: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 20,
  },
});
