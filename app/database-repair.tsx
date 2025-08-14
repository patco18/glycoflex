import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FirebaseRepairTool } from '@/utils/firebaseRepairTool';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Écran de réparation complète de la base de données Firebase
 */
export default function DatabaseRepairScreen() {
  const { user } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Lancer l'analyse de la base de données
  const handleAnalyze = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour analyser la base de données');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      
      const result = await FirebaseRepairTool.analyzeDatabase();
      
      if (result.status === 'success') {
        setReport(result.report);
        
        if (result.report.corruptedDocuments > 0) {
          Alert.alert(
            'Analyse terminée',
            `${result.report.corruptedDocuments} documents corrompus détectés sur un total de ${result.report.totalDocuments} documents.`
          );
        } else {
          Alert.alert(
            'Analyse terminée',
            `Aucun problème détecté dans votre base de données (${result.report.totalDocuments} documents analysés).`
          );
        }
      } else {
        setError(result.report.error);
        Alert.alert('Erreur', `L'analyse a échoué: ${result.report.error}`);
      }
    } catch (error) {
      setError(String(error));
      Alert.alert('Erreur', `Une erreur inattendue s'est produite: ${String(error)}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Lancer la réparation de la base de données
  const handleRepair = () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour réparer la base de données');
      return;
    }

    if (!report || report.corruptedDocuments === 0) {
      Alert.alert(
        'Aucune réparation nécessaire',
        'Aucun document corrompu n\'a été détecté lors de l\'analyse.'
      );
      return;
    }

    Alert.alert(
      'Confirmation de réparation',
      `Cette opération va supprimer ${report.corruptedDocuments} documents corrompus et réinitialiser l'état de synchronisation. Voulez-vous continuer ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Réparer',
          style: 'destructive',
          onPress: async () => {
            try {
              setRepairing(true);
              setError(null);
              
              const result = await FirebaseRepairTool.repairDatabase({
                deleteCorrupted: true,
                resetSyncState: true
              });
              
              if (result.status === 'success') {
                setReport(result.report);
                
                Alert.alert(
                  'Réparation terminée',
                  `${result.report.deletedDocuments} documents corrompus ont été supprimés et l'état de synchronisation a été réinitialisé.`
                );
              } else {
                setError(result.report.error);
                Alert.alert('Erreur', `La réparation a échoué: ${result.report.error}`);
              }
            } catch (error) {
              setError(String(error));
              Alert.alert('Erreur', `Une erreur inattendue s'est produite: ${String(error)}`);
            } finally {
              setRepairing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Réparation de Firebase</Text>
          <Text style={styles.subtitle}>
            Analysez et réparez les problèmes de synchronisation
          </Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Comment utiliser cet outil</Text>
            <Text style={styles.infoText}>
              1. Commencez par analyser votre base de données pour détecter les problèmes
            </Text>
            <Text style={styles.infoText}>
              2. Examinez les résultats pour comprendre les problèmes détectés
            </Text>
            <Text style={styles.infoText}>
              3. Lancez la réparation pour corriger automatiquement les problèmes
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, analyzing && styles.buttonDisabled]}
              onPress={handleAnalyze}
              disabled={analyzing || repairing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Analyser la base de données</Text>
              )}
            </TouchableOpacity>

            {report && report.corruptedDocuments > 0 && (
              <TouchableOpacity
                style={[styles.repairButton, repairing && styles.buttonDisabled]}
                onPress={handleRepair}
                disabled={analyzing || repairing}
              >
                {repairing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Réparer les problèmes</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Erreur</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {report && (
            <View style={styles.reportCard}>
              <Text style={styles.reportTitle}>Rapport d'analyse</Text>
              
              <View style={styles.reportItem}>
                <Text style={styles.reportLabel}>Documents totaux :</Text>
                <Text style={styles.reportValue}>{report.totalDocuments}</Text>
              </View>
              
              <View style={styles.reportItem}>
                <Text style={styles.reportLabel}>Documents corrompus :</Text>
                <Text style={[
                  styles.reportValue,
                  report.corruptedDocuments > 0 ? styles.reportValueBad : styles.reportValueGood
                ]}>
                  {report.corruptedDocuments}
                </Text>
              </View>
              
              {report.deletedDocuments !== undefined && (
                <View style={styles.reportItem}>
                  <Text style={styles.reportLabel}>Documents supprimés :</Text>
                  <Text style={styles.reportValue}>{report.deletedDocuments}</Text>
                </View>
              )}
              
              {report.resetSyncState !== undefined && (
                <View style={styles.reportItem}>
                  <Text style={styles.reportLabel}>État de synchronisation :</Text>
                  <Text style={styles.reportValue}>
                    {report.resetSyncState ? 'Réinitialisé' : 'Inchangé'}
                  </Text>
                </View>
              )}
              
              {report.corruptedList && report.corruptedList.length > 0 && (
                <>
                  <Text style={styles.corruptedListTitle}>
                    Liste des documents corrompus
                  </Text>
                  {report.corruptedList.slice(0, 5).map((item: any, index: number) => (
                    <View key={index} style={styles.corruptedItem}>
                      <Text style={styles.corruptedId} numberOfLines={1} ellipsizeMode="middle">
                        {item.id}
                      </Text>
                      <Text style={styles.corruptedReason}>
                        {item.reason}
                      </Text>
                    </View>
                  ))}
                  {report.corruptedList.length > 5 && (
                    <Text style={styles.moreItems}>
                      +{report.corruptedList.length - 5} autres documents
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
          
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ La réparation supprimera les documents corrompus de la base de données.
              Cette opération est irréversible.
            </Text>
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
  header: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
    lineHeight: 20,
  },
  actionButtons: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4C51BF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  repairButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: '#FED7D7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E53E3E',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C53030',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#C53030',
  },
  reportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 12,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  reportLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  reportValue: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: 'bold',
  },
  reportValueGood: {
    color: '#38A169',
  },
  reportValueBad: {
    color: '#E53E3E',
  },
  corruptedListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A5568',
    marginTop: 16,
    marginBottom: 8,
  },
  corruptedItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  corruptedId: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
    marginBottom: 4,
  },
  corruptedReason: {
    fontSize: 12,
    color: '#718096',
  },
  moreItems: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  disclaimer: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 247, 237, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ED8936',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#9C4221',
    textAlign: 'center',
  },
});
