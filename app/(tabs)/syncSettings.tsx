import { StyleSheet, View, Text, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { CloudIcon, Lock, RefreshCcw, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getCloudStorageProvider } from '@/utils/cloudStorageProvider';
import { auth } from '@/utils/internalAuth';
import { ScrollView } from 'react-native-gesture-handler';
import { useToast } from '@/hooks/useToast';

export default function SyncSettingsScreen() {
  const { t } = useTranslation();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const toast = useToast();
  const { hybrid: cloudHybrid } = getCloudStorageProvider();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      console.log('🔄 Chargement des paramètres de synchronisation');

      if (!auth.currentUser) {
        console.log('❌ Utilisateur non authentifié');
        setLoading(false);
        return;
      }

      console.log('👤 Utilisateur authentifié:', auth.currentUser.uid);

      const enabled = await cloudHybrid.isSyncEnabled();
      setSyncEnabled(enabled);
      console.log('🔄 Synchronisation activée:', enabled);

      const lastSync = await cloudHybrid.getLastSyncTime();
      setLastSyncTime(lastSync);
      console.log('⏱️ Dernière synchronisation:', lastSync ? new Date(lastSync).toLocaleString() : 'Jamais');

      const pendingCount = await cloudHybrid.getPendingOperationsCount();
      setPendingOperations(pendingCount);
      console.log('📝 Opérations en attente:', pendingCount);

      console.log('✅ Paramètres de synchronisation chargés avec succès');
    } catch (error) {
      console.error('❌ Échec du chargement des paramètres de synchronisation:', error);
      toast.show(t('common.error'), t('syncSettings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSync = async (value: boolean) => {
    try {
      setSyncing(true);
      await cloudHybrid.setSyncEnabled(value);
      setSyncEnabled(value);

      if (value) {
        await cloudHybrid.syncWithCloud();
        const lastSync = await cloudHybrid.getLastSyncTime();
        setLastSyncTime(lastSync);
      }
    } catch (error) {
      console.error('Échec de la modification de la synchronisation:', error);
      toast.show(t('common.error'), t('syncSettings.toggleError'));
      setSyncEnabled(!value);
    } finally {
      setSyncing(false);
    }
  };

  const syncNow = async () => {
    try {
      console.log('🔄 Synchronisation manuelle démarrée');
      setSyncing(true);

      const netInfo = await import('@react-native-community/netinfo').then(m => m.default.fetch());

      if (!netInfo.isConnected) {
        console.log('❌ Pas de connexion internet');
        toast.show(
          t('common.error'),
          t('syncSettings.noInternetConnection'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      if (!auth.currentUser) {
        console.log('❌ Utilisateur non authentifié');
        toast.show(
          t('common.error'),
          t('syncSettings.notLoggedIn'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      console.log('👤 Synchronisation pour l\'utilisateur:', auth.currentUser.uid);

      await cloudHybrid.syncWithCloud();

      const lastSync = await cloudHybrid.getLastSyncTime();
      setLastSyncTime(lastSync);
      console.log('⏱️ Nouvelle heure de synchronisation:', lastSync ? new Date(lastSync).toLocaleString() : 'Erreur');

      const pendingCount = await cloudHybrid.getPendingOperationsCount();
      setPendingOperations(pendingCount);
      console.log('📝 Opérations en attente restantes:', pendingCount);

      console.log('✅ Synchronisation manuelle terminée avec succès');
      toast.show(t('common.success'), t('syncSettings.syncSuccess'));
    } catch (error) {
      console.error('❌ Échec de la synchronisation:', error);
      toast.show(
        t('common.error'),
        `${t('syncSettings.syncError')} (${error instanceof Error ? error.message : 'Unknown error'})`
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667EEA" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={['#667EEA', '#764BA2', '#F093FB']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('syncSettings.title')}</Text>
            <Text style={styles.subtitle}>{t('syncSettings.subtitle')}</Text>
          </View>

          <View style={styles.providerBadge}>
            <ShieldCheck size={16} color="#667EEA" />
            <Text style={styles.providerText}>
              {t('syncSettings.postgresProviderLabel')}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CloudIcon size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('syncSettings.cloudSync')}</Text>
            </View>

            <Text style={styles.description}>
              {t('syncSettings.cloudSyncDescription')}
            </Text>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>{t('syncSettings.enableSync')}</Text>
              <Switch
                value={syncEnabled}
                onValueChange={toggleSync}
                disabled={syncing || !auth.currentUser}
                trackColor={{ false: '#D1D5DB', true: '#667EEA' }}
                thumbColor={syncEnabled ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>

            {!auth.currentUser && (
              <View style={styles.warningContainer}>
                <AlertTriangle size={16} color="#FF6B35" />
                <Text style={styles.warningText}>
                  {t('syncSettings.signInRequired')}
                </Text>
              </View>
            )}

            {syncEnabled && (
              <>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>
                    {t('syncSettings.lastSynced')}:
                  </Text>
                  <Text style={styles.infoValue}>
                    {lastSyncTime
                      ? new Date(lastSyncTime).toLocaleString()
                      : t('syncSettings.never')}
                  </Text>
                </View>

                {pendingOperations > 0 && (
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoLabel}>
                      {t('syncSettings.pendingOperations')}:
                    </Text>
                    <Text style={styles.infoValue}>
                      {pendingOperations}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                  onPress={syncNow}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <RefreshCcw size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.syncButtonText}>
                    {syncing
                      ? t('syncSettings.syncing')
                      : t('syncSettings.syncNow')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('syncSettings.postgresSecurityTitle')}</Text>
            </View>
            <Text style={styles.description}>
              {t('syncSettings.postgresSecurityDescription')}
            </Text>
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333'
  },
  gradient: {
    minHeight: '100%',
    padding: 16
  },
  header: {
    marginBottom: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center'
  },
  providerBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    marginBottom: 16
  },
  providerText: {
    color: '#667EEA',
    fontWeight: '600'
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  switchLabel: {
    fontSize: 16,
    color: '#333'
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8
  },
  warningText: {
    fontSize: 14,
    color: '#FF6B35',
    marginLeft: 6,
    flex: 1
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  syncButton: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginVertical: 8
  },
  syncButtonDisabled: {
    backgroundColor: '#A0AEC0'
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  }
});
