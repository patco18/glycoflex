import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { EnhancedEncryptionService } from '@/utils/enhancedCrypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Écran de gestion avancée des clés de chiffrement
 */
export default function EncryptionManagementScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [keyInfo, setKeyInfo] = useState<{ version: number; hash: string } | null>(null);

  // Charger les informations sur la clé actuelle
  const loadKeyInfo = async () => {
    try {
      setLoading(true);
      
      // Charger la version de la clé depuis AsyncStorage
      const versionStr = await AsyncStorage.getItem('GLYCOFLEX_KEY_VERSION');
      const version = versionStr ? parseInt(versionStr, 10) : 1;
      
      // Initialiser la clé pour s'assurer qu'elle est chargée
      await EnhancedEncryptionService.initializeEncryptionKey();
      
      // Exécuter un test de chiffrement
      const testSuccess = await EnhancedEncryptionService.testCrypto();
      setTestResult(testSuccess);
      
      // Récupérer le hash pour affichage
      const keyHash = await AsyncStorage.getItem('GLYCOFLEX_KEY_HASH') || 'non disponible';
      
      setKeyInfo({ version, hash: keyHash.substring(0, 10) });
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Impossible de charger les informations de clé: ' + String(error)
      );
    } finally {
      setLoading(false);
    }
  };

  // Réinitialiser la clé de chiffrement
  const handleResetKey = () => {
    Alert.alert(
      'Réinitialiser la clé',
      'Cette opération va générer une nouvelle clé de chiffrement. Les anciennes clés seront sauvegardées comme clés legacy. Voulez-vous continuer ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              setResetInProgress(true);
              
              // Réinitialiser la clé
              await EnhancedEncryptionService.resetEncryptionKey();
              
              // Recharger les informations
              await loadKeyInfo();
              
              Alert.alert(
                'Succès',
                'La clé de chiffrement a été réinitialisée avec succès.'
              );
            } catch (error) {
              Alert.alert(
                'Erreur',
                'Impossible de réinitialiser la clé: ' + String(error)
              );
            } finally {
              setResetInProgress(false);
            }
          }
        }
      ]
    );
  };

  // Tester le système de chiffrement
  const handleTestEncryption = async () => {
    try {
      setLoading(true);
      const result = await EnhancedEncryptionService.testCrypto();
      setTestResult(result);
      
      Alert.alert(
        result ? 'Test réussi' : 'Test échoué',
        result
          ? 'Le système de chiffrement fonctionne correctement.'
          : 'Le test de chiffrement a échoué. Vous devriez réinitialiser la clé.'
      );
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Impossible de tester le chiffrement: ' + String(error)
      );
    } finally {
      setLoading(false);
    }
  };

  // Charger les informations au premier rendu
  React.useEffect(() => {
    loadKeyInfo();
  }, []);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>Vous devez être connecté pour accéder à cette page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Gestion du chiffrement',
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>État du chiffrement</Text>
              
              {loading ? (
                <ActivityIndicator size="small" color="#667EEA" style={styles.loader} />
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Version de la clé :</Text>
                    <Text style={styles.infoValue}>{keyInfo?.version || 'Inconnue'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Empreinte :</Text>
                    <Text style={styles.infoValue}>{keyInfo?.hash || 'Non disponible'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Test de chiffrement :</Text>
                    {testResult === null ? (
                      <Text style={styles.infoValue}>Non testé</Text>
                    ) : testResult ? (
                      <Text style={[styles.infoValue, styles.successText]}>Réussi ✓</Text>
                    ) : (
                      <Text style={[styles.infoValue, styles.errorText]}>Échoué ✗</Text>
                    )}
                  </View>
                </>
              )}
              
              <TouchableOpacity
                style={styles.button}
                onPress={handleTestEncryption}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Tester le chiffrement</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Actions de maintenance</Text>
              <Text style={styles.cardDescription}>
                Ces actions peuvent vous aider à résoudre les problèmes de chiffrement et de synchronisation.
              </Text>
              
              <TouchableOpacity
                style={[styles.dangerButton, resetInProgress && styles.disabledButton]}
                onPress={handleResetKey}
                disabled={resetInProgress}
              >
                {resetInProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Réinitialiser la clé de chiffrement</Text>
                )}
              </TouchableOpacity>
              
              <Text style={styles.warningText}>
                ⚠️ La réinitialisation de la clé peut affecter la capacité à déchiffrer d'anciennes données.
                Les clés précédentes seront conservées comme clés de secours.
              </Text>
            </View>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Comment fonctionne le chiffrement</Text>
              <Text style={styles.infoBoxText}>
                • Toutes vos données sont chiffrées localement avant d'être envoyées au cloud
              </Text>
              <Text style={styles.infoBoxText}>
                • La clé de chiffrement est stockée uniquement sur votre appareil
              </Text>
              <Text style={styles.infoBoxText}>
                • Le système conserve les anciennes clés pour déchiffrer les données existantes
              </Text>
              <Text style={styles.infoBoxText}>
                • En cas de problème, réinitialiser la clé peut résoudre les erreurs de déchiffrement
              </Text>
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: 'bold',
  },
  successText: {
    color: '#38A169',
  },
  errorText: {
    color: '#E53E3E',
  },
  button: {
    backgroundColor: '#4C51BF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  dangerButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  warningText: {
    fontSize: 12,
    color: '#C53030',
    marginTop: 12,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(235, 248, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4299E1',
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B6CB0',
    marginBottom: 12,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#2C5282',
    marginBottom: 8,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 16,
  },
});
