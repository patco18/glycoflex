import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Database, Cloud, AlertTriangle, CheckCircle, RefreshCw, Trash2, Upload, Shield } from 'lucide-react-native';
import { StorageManager } from '@/utils/storageManager';
import { SecureCloudStorage, EncryptionService, CorruptionCircuitBreaker } from '@/utils/secureCloudStorage';
import { markProblematicDocumentsAsCorrupted } from '@/utils/cleanupTools';
import { SyncDiagnostic } from '@/utils/syncDiagnostic';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageStats {
  localCount: number;
  cloudCount: number;
  syncEnabled: boolean;
  lastSync: number | null;
  errorCount: number;
}

interface DiagnosticInfo {
  encryptionKeyInitialized: boolean;
  corruptedDocs: string[];
  ignoredDocs: string[];
  cloudConnectivity: boolean;
  userAuthenticated: boolean;
  circuitBreakerStatus: string;
}

export default function StorageDiagnostic() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    setLoading(true);
    try {
      // Charger les statistiques de stockage
      const storageStats = await StorageManager.getStorageStats();
      setStats(storageStats);

      // Diagnostic approfondi
      const diagInfo: DiagnosticInfo = {
        encryptionKeyInitialized: false,
        corruptedDocs: [],
        ignoredDocs: [],
        cloudConnectivity: false,
        userAuthenticated: !!user,
        circuitBreakerStatus: await CorruptionCircuitBreaker.getStatus()
      };

      try {
        // Tester l'initialisation de la clé d'encryption
        await EncryptionService.initializeEncryptionKey();
        diagInfo.encryptionKeyInitialized = true;
      } catch (error) {
        console.error('Erreur initialisation clé:', error);
      }

      try {
        // Récupérer les documents corrompus
        diagInfo.corruptedDocs = SecureCloudStorage.getCorruptedDocIds();
        diagInfo.ignoredDocs = await SecureCloudStorage.getIgnoredCorruptedDocIds();
      } catch (error) {
        console.error('Erreur récupération docs corrompus:', error);
      }

      try {
        // Tester la connectivité cloud
        if (user) {
          await SecureCloudStorage.getMeasurements();
          diagInfo.cloudConnectivity = true;
        }
      } catch (error) {
        console.error('Erreur connectivité cloud:', error);
      }

      setDiagnostic(diagInfo);
    } catch (error) {
      console.error('Erreur chargement diagnostic:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour synchroniser');
      return;
    }

    setActionInProgress('sync');
    try {
      await StorageManager.forceSyncNow();
      Alert.alert('Succès', 'Synchronisation terminée avec succès');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur sync forcée:', error);
      Alert.alert('Erreur', 'Échec de la synchronisation');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCleanupCorrupted = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour nettoyer');
      return;
    }

    Alert.alert(
      'Confirmation',
      'Voulez-vous marquer les documents corrompus pour nettoyage ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: performCleanup }
      ]
    );
  };

  const performCleanup = async () => {
    setActionInProgress('cleanup');
    try {
      await markProblematicDocumentsAsCorrupted();
      Alert.alert('Succès', 'Documents corrompus marqués pour nettoyage');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur nettoyage:', error);
      Alert.alert('Erreur', 'Échec du nettoyage des documents corrompus');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRunFullDiagnostic = async () => {
    setActionInProgress('diagnostic');
    try {
      const fullDiagnostic = await SyncDiagnostic.fullDiagnostic();
      console.log('📋 Diagnostic complet:', fullDiagnostic);
      
      let message = `Diagnostic terminé.\n\n`;
      message += `Utilisateur: ${fullDiagnostic.user?.authenticated ? 'Connecté' : 'Non connecté'}\n`;
      message += `Mesures locales: ${fullDiagnostic.storage?.count || 0}\n`;
      message += `Mesures cloud: ${fullDiagnostic.cloud?.count || 0}\n`;
      message += `Problèmes: ${fullDiagnostic.issues?.length || 0}\n`;
      
      if (fullDiagnostic.issues?.length > 0) {
        message += `\nProblèmes détectés:\n• ${fullDiagnostic.issues.join('\n• ')}`;
      }
      
      Alert.alert('Diagnostic Complet', message);
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur diagnostic complet:', error);
      Alert.alert('Erreur', 'Échec du diagnostic complet');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleForceSyncLocal = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour synchroniser');
      return;
    }

    setActionInProgress('force-sync-local');
    try {
      await SyncDiagnostic.forceSyncLocalToCloud();
      Alert.alert('Succès', 'Synchronisation forcée des données locales terminée');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur force sync local:', error);
      Alert.alert('Erreur', 'Échec de la synchronisation forcée');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResetStorage = async () => {
    Alert.alert(
      'Attention !',
      'Cette action va réinitialiser complètement le stockage. Tous les logs d\'erreur seront effacés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: performReset }
      ]
    );
  };

  const handleUnblockUploads = async () => {
    console.log('🚨 BOUTON DÉBLOQUER UPLOADS CLIQUÉ !');
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour débloquer les uploads');
      return;
    }

    await performUnblockUploads();
  };

  const performUnblockUploads = async () => {
    setActionInProgress('unblock');
    try {
      console.log('🧹 Début du nettoyage radical...');
      const { SecureHybridStorage } = await import('@/utils/secureCloudStorage');
      await SecureHybridStorage.forceUploadBlockedMeasurements();
      
      // Essayer la synchronisation
      try {
        await StorageManager.forceSyncNow();
        Alert.alert('Succès', 'Uploads débloqués et synchronisation lancée');
      } catch (syncError) {
        console.warn('Sync échouée après nettoyage:', syncError);
        Alert.alert('Info', 'Nettoyage effectué. Redémarrez l\'app pour finaliser.');
      }
      
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur déblocage uploads:', error);
      Alert.alert('Erreur', 'Échec du déblocage: ' + String(error));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResetCircuitBreaker = async () => {
    setActionInProgress('circuit-reset');
    try {
      await CorruptionCircuitBreaker.reset();
      Alert.alert('Succès', 'Circuit breaker réinitialisé avec succès');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur reset circuit breaker:', error);
      Alert.alert('Erreur', 'Échec du reset: ' + String(error));
    } finally {
      setActionInProgress(null);
    }
  };

  const performReset = async () => {
    setActionInProgress('reset');
    try {
      await StorageManager.cleanup();
      await SyncDiagnostic.cleanupSyncData();
      Alert.alert('Succès', 'Stockage réinitialisé avec succès');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur reset:', error);
      Alert.alert('Erreur', 'Échec de la réinitialisation');
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle size={20} color="#10B981" /> : <AlertTriangle size={20} color="#EF4444" />;
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Jamais';
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <RefreshCw size={24} color="#FFF" />
            <Text style={styles.loadingText}>Chargement du diagnostic...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.title}>Diagnostic de Stockage</Text>

          {/* Statistiques générales */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Database size={20} color="#667EEA" />
              <Text style={styles.cardTitle}>Statistiques</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Mesures locales:</Text>
              <Text style={styles.statValue}>{stats?.localCount || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Mesures cloud:</Text>
              <Text style={styles.statValue}>
                {stats?.cloudCount === -1 ? 'Erreur' : (stats?.cloudCount || 0)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Synchronisation:</Text>
              <Text style={[styles.statValue, { color: stats?.syncEnabled ? '#10B981' : '#EF4444' }]}>
                {stats?.syncEnabled ? 'Activée' : 'Désactivée'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Dernière sync:</Text>
              <Text style={styles.statValue}>{formatLastSync(stats?.lastSync || null)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Erreurs:</Text>
              <Text style={[styles.statValue, { color: (stats?.errorCount || 0) > 0 ? '#EF4444' : '#10B981' }]}>
                {stats?.errorCount || 0}
              </Text>
            </View>
          </View>

          {/* Diagnostic système */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Cloud size={20} color="#667EEA" />
              <Text style={styles.cardTitle}>État du Système</Text>
            </View>
            <View style={styles.diagnosticRow}>
              {getStatusIcon(diagnostic?.userAuthenticated || false)}
              <Text style={styles.diagnosticLabel}>Utilisateur connecté</Text>
            </View>
            <View style={styles.diagnosticRow}>
              {getStatusIcon(diagnostic?.encryptionKeyInitialized || false)}
              <Text style={styles.diagnosticLabel}>Clé de chiffrement</Text>
            </View>
            <View style={styles.diagnosticRow}>
              {getStatusIcon(diagnostic?.cloudConnectivity || false)}
              <Text style={styles.diagnosticLabel}>Connectivité cloud</Text>
            </View>
            <View style={styles.diagnosticRow}>
              <Shield size={16} color={diagnostic?.circuitBreakerStatus?.includes('🚨') ? '#EF4444' : '#10B981'} />
              <Text style={styles.diagnosticLabel}>Circuit Breaker: {diagnostic?.circuitBreakerStatus}</Text>
            </View>
            <View style={styles.diagnosticRow}>
              {getStatusIcon((diagnostic?.corruptedDocs.length || 0) === 0)}
              <Text style={styles.diagnosticLabel}>
                Documents corrompus: {diagnostic?.corruptedDocs.length || 0}
              </Text>
            </View>
            <View style={styles.diagnosticRow}>
              {getStatusIcon((diagnostic?.ignoredDocs.length || 0) === 0)}
              <Text style={styles.diagnosticLabel}>
                Documents ignorés: {diagnostic?.ignoredDocs.length || 0}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, actionInProgress === 'sync' && styles.actionButtonDisabled]}
              onPress={handleForceSync}
              disabled={actionInProgress !== null || !user}
            >
              <RefreshCw size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'sync' ? 'Synchronisation...' : 'Forcer la Sync'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton, actionInProgress === 'cleanup' && styles.actionButtonDisabled]}
              onPress={handleCleanupCorrupted}
              disabled={actionInProgress !== null || !user}
            >
              <Trash2 size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'cleanup' ? 'Nettoyage...' : 'Nettoyer Documents'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton, actionInProgress === 'reset' && styles.actionButtonDisabled]}
              onPress={handleResetStorage}
              disabled={actionInProgress !== null}
            >
              <AlertTriangle size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'reset' ? 'Réinitialisation...' : 'Reset Stockage'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={loadDiagnosticData}
              disabled={actionInProgress !== null}
            >
              <RefreshCw size={16} color="#667EEA" />
              <Text style={[styles.actionButtonText, { color: '#667EEA' }]}>Actualiser</Text>
            </TouchableOpacity>

            {/* Reset Circuit Breaker */}
            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton, actionInProgress === 'circuit-reset' && styles.actionButtonDisabled]}
              onPress={handleResetCircuitBreaker}
              disabled={actionInProgress !== null}
            >
              <Shield size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'circuit-reset' ? 'Reset...' : 'Reset Circuit Breaker'}
              </Text>
            </TouchableOpacity>

            {/* Nouveaux boutons de diagnostic */}
            <TouchableOpacity
              style={[styles.actionButton, actionInProgress === 'diagnostic' && styles.actionButtonDisabled]}
              onPress={handleRunFullDiagnostic}
              disabled={actionInProgress !== null}
            >
              <AlertTriangle size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'diagnostic' ? 'Diagnostic...' : 'Diagnostic Complet'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton, actionInProgress === 'force-sync-local' && styles.actionButtonDisabled]}
              onPress={handleForceSyncLocal}
              disabled={actionInProgress !== null || !user}
            >
              <RefreshCw size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'force-sync-local' ? 'Sync Local...' : 'Force Sync Local→Cloud'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton, actionInProgress === 'unblock' && styles.actionButtonDisabled]}
              onPress={handleUnblockUploads}
              disabled={actionInProgress !== null || !user}
            >
              <Upload size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {actionInProgress === 'unblock' ? 'Déblocage...' : 'Débloquer Uploads'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  diagnosticLabel: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 12,
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#667EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667EEA',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
