import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Database, Cloud, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react-native';
import { StorageManager } from '@/utils/storageManager';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getCloudStorageProvider } from '@/utils/cloudStorageProvider';

interface StorageStats {
  localCount: number;
  cloudCount: number;
  syncEnabled: boolean;
  lastSync: number | null;
  errorCount: number;
}

interface DiagnosticInfo {
  cloudConnectivity: boolean;
  userAuthenticated: boolean;
}

export default function StorageDiagnostic() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const toast = useToast();
  const { cloud: cloudStorage } = getCloudStorageProvider();

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    setLoading(true);
    try {
      const storageStats = await StorageManager.getStorageStats();
      setStats(storageStats);

      const diagInfo: DiagnosticInfo = {
        cloudConnectivity: false,
        userAuthenticated: !!user,
      };

      if (user) {
        try {
          await cloudStorage.getMeasurements();
          diagInfo.cloudConnectivity = true;
        } catch (error) {
          console.error('Erreur connectivité cloud:', error);
        }
      }

      setDiagnostic(diagInfo);
    } catch (error) {
      console.error('Erreur chargement diagnostic:', error);
      toast.show('Erreur', 'Impossible de charger les données de diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    if (!user) {
      toast.show('Erreur', 'Vous devez être connecté pour synchroniser');
      return;
    }

    setActionInProgress('sync');
    try {
      await StorageManager.forceSyncNow();
      toast.show('Succès', 'Synchronisation terminée avec succès');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur sync forcée:', error);
      toast.show('Erreur', 'Échec de la synchronisation');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResetStorage = async () => {
    toast.show(
      'Attention !',
      "Cette action va réinitialiser complètement le stockage. Tous les logs d'erreur seront effacés.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: performReset }
      ]
    );
  };

  const performReset = async () => {
    setActionInProgress('reset');
    try {
      await StorageManager.cleanup();
      toast.show('Succès', 'Stockage réinitialisé avec succès');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.show('Erreur', 'Échec de la réinitialisation');
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
              {getStatusIcon(diagnostic?.cloudConnectivity || false)}
              <Text style={styles.diagnosticLabel}>Connectivité PostgreSQL</Text>
            </View>
          </View>

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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diagnosticLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  actionsContainer: {
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667EEA',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#667EEA',
  },
});
