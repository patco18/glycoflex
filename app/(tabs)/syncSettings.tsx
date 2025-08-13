import { Platform, StyleSheet, View, Text, Switch, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { CloudIcon, Lock, Key, RefreshCcw, AlertTriangle, Smartphone, X, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SecureCloudStorage, SecureHybridStorage, EncryptionService } from '@/utils/secureCloudStorage';
import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, FlatList } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';

const LOCAL_RECOVERY_PHRASE = 'recovery_phrase';

export default function SyncSettingsScreen() {
  const { t } = useTranslation();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [recoveryPhraseCreated, setRecoveryPhraseCreated] = useState(false);
  const [devices, setDevices] = useState<{id: string; name: string; lastActive: number; isCurrentDevice: boolean}[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [legacyKeyInput, setLegacyKeyInput] = useState('');
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [corruptedCounts, setCorruptedCounts] = useState<{corrupted:number; ignored:number}>({corrupted:0, ignored:0});
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    setLoading(true);
    try {
      console.log("🔄 Chargement des paramètres de synchronisation");
      
      // Vérifier si l'utilisateur est authentifié
      if (!auth.currentUser) {
        console.log("❌ Utilisateur non authentifié");
        // Rediriger vers l'écran d'authentification ou afficher une invite de connexion
        setLoading(false);
        return;
      }
      
      console.log("👤 Utilisateur authentifié:", auth.currentUser.uid);
      
      // Charger l'état de la synchronisation
      const enabled = await SecureHybridStorage.isSyncEnabled();
      setSyncEnabled(enabled);
      console.log("🔄 Synchronisation activée:", enabled);
      
      // Obtenir l'heure de dernière synchronisation
      const lastSync = await SecureHybridStorage.getLastSyncTime();
      setLastSyncTime(lastSync);
      console.log("⏱️ Dernière synchronisation:", lastSync ? new Date(lastSync).toLocaleString() : "Jamais");
      
      // Vérifier les opérations en attente
      const pendingCount = await SecureHybridStorage.getPendingOperationsCount();
      setPendingOperations(pendingCount);
      console.log("📝 Opérations en attente:", pendingCount);
      
      // Vérifier les conflits
      const { hasConflicts } = await SecureCloudStorage.checkForConflicts();
      setHasConflicts(hasConflicts);
      console.log("⚠️ Conflits détectés:", hasConflicts);
      
      // Vérifier si la phrase de récupération existe
      const hasRecoveryPhrase = await checkRecoveryPhrase();
      setRecoveryPhraseCreated(hasRecoveryPhrase);
      console.log("🔑 Phrase de récupération créée:", hasRecoveryPhrase);
      
      // Charger les appareils
      await loadDevices();

      // Charger stats docs corrompus
      try {
        const corrupted = SecureCloudStorage.getCorruptedDocIds().length;
        const ignored = (await SecureCloudStorage.getIgnoredCorruptedDocIds()).length;
        setCorruptedCounts({ corrupted, ignored });
      } catch {}
      
      console.log("✅ Paramètres de synchronisation chargés avec succès");
    } catch (error) {
      console.error('❌ Échec du chargement des paramètres de synchronisation:', error);
      Alert.alert(t('common.error'), t('syncSettings.loadError'));
    } finally {
      setLoading(false);
    }
  };
  
  const checkRecoveryPhrase = async (): Promise<boolean> => {
    try {
      const phrase = await SecureStore.getItemAsync(LOCAL_RECOVERY_PHRASE);
      return !!phrase;
    } catch (error) {
      return false;
    }
  };
  
  const loadDevices = async () => {
    try {
      setDeviceLoading(true);
      const devicesList = await SecureCloudStorage.getConnectedDevices();
      // Map the property name from isCurrent to isCurrentDevice
      setDevices(devicesList.map(device => ({
        ...device,
        isCurrentDevice: device.isCurrent
      })));
    } catch (error) {
      console.error('Échec du chargement des appareils:', error);
    } finally {
      setDeviceLoading(false);
    }
  };
  
  const toggleSync = async (value: boolean) => {
    try {
      setSyncing(true);
      
      // Si activation de la synchronisation et pas de phrase de récupération, en créer une
      if (value && !recoveryPhraseCreated) {
        await createRecoveryPhrase();
      }
      
      await SecureHybridStorage.setSyncEnabled(value);
      setSyncEnabled(value);
      
      if (value) {
        // Effectuer une synchronisation initiale
        await SecureHybridStorage.syncWithCloud();
        const lastSync = await SecureHybridStorage.getLastSyncTime();
        setLastSyncTime(lastSync);
        
        // Mettre à jour la liste des appareils
        await loadDevices();
      }
    } catch (error) {
      console.error('Échec de la modification de la synchronisation:', error);
      Alert.alert(t('common.error'), t('syncSettings.toggleError'));
      setSyncEnabled(!value); // Revenir à l'état précédent
    } finally {
      setSyncing(false);
    }
  };
  
  const syncNow = async () => {
    try {
      console.log("🔄 Synchronisation manuelle démarrée");
      setSyncing(true);
      
      // Vérifier l'état de la connexion
      const netInfo = await import('@react-native-community/netinfo').then(m => m.default.fetch());
      
      if (!netInfo.isConnected) {
        console.log("❌ Pas de connexion internet");
        Alert.alert(
          t('common.error'),
          t('syncSettings.noInternetConnection'),
          [{ text: t('common.ok') }]
        );
        return;
      }
      
      // Vérifier l'état de l'authentification
      if (!auth.currentUser) {
        console.log("❌ Utilisateur non authentifié");
        Alert.alert(
          t('common.error'),
          t('syncSettings.notLoggedIn'),
          [{ text: t('common.ok') }]
        );
        return;
      }
      
      console.log("👤 Synchronisation pour l'utilisateur:", auth.currentUser.uid);
      
      // Synchroniser avec le cloud
      await SecureHybridStorage.syncWithCloud();
      
      // Recharger les données
      const lastSync = await SecureHybridStorage.getLastSyncTime();
      setLastSyncTime(lastSync);
      console.log("⏱️ Nouvelle heure de synchronisation:", lastSync ? new Date(lastSync).toLocaleString() : "Erreur");
      
      const pendingCount = await SecureHybridStorage.getPendingOperationsCount();
      setPendingOperations(pendingCount);
      console.log("📝 Opérations en attente restantes:", pendingCount);
      
      // Vérifier les conflits
      const { hasConflicts } = await SecureCloudStorage.checkForConflicts();
      setHasConflicts(hasConflicts);
      console.log("⚠️ Conflits après synchronisation:", hasConflicts);
      
      // Mettre à jour la liste des appareils
      await loadDevices();
      
      console.log("✅ Synchronisation manuelle terminée avec succès");
      Alert.alert(t('common.success'), t('syncSettings.syncSuccess'));
    } catch (error) {
      console.error('❌ Échec de la synchronisation:', error);
      Alert.alert(
        t('common.error'), 
        `${t('syncSettings.syncError')} (${error instanceof Error ? error.message : 'Unknown error'})`
      );
    } finally {
      setSyncing(false);
    }
  };

  const backupEncryptionKey = async () => {
    if (!recoveryPhraseCreated) {
      Alert.alert(t('common.error'), t('syncSettings.backupNeeded'));
      return;
    }
    try {
      setBackupLoading(true);
      const phrase = await SecureStore.getItemAsync(LOCAL_RECOVERY_PHRASE);
      if (!phrase) {
        Alert.alert(t('common.error'), t('syncSettings.noPhraseFound'));
        return;
      }
      await SecureHybridStorage.backupEncryptionKeyWithPhrase(phrase);
      Alert.alert(t('common.success'), t('syncSettings.backupSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), t('syncSettings.backupError'));
    } finally {
      setBackupLoading(false);
    }
  };

  const restoreEncryptionKey = async () => {
    if (!phraseInput.trim()) {
      Alert.alert(t('common.error'), t('syncSettings.enterRecoveryPhrase'));
      return;
    }
    try {
      setRestoreLoading(true);
      await SecureHybridStorage.restoreEncryptionKeyWithPhrase(phraseInput.trim());
      Alert.alert(t('common.success'), t('syncSettings.restoreSuccess'));
      // Après restauration, lancer une synchro
      await SecureHybridStorage.syncWithCloud();
      const lastSync = await SecureHybridStorage.getLastSyncTime();
      setLastSyncTime(lastSync);
    } catch (e) {
      Alert.alert(t('common.error'), t('syncSettings.restoreError'));
    } finally {
      setRestoreLoading(false);
    }
  };

  const addLegacyKey = async () => {
    if (!legacyKeyInput.trim()) return;
    try {
      await EncryptionService.addLegacyKeyCandidate(legacyKeyInput.trim());
      Alert.alert(t('common.success'), 'Clé legacy ajoutée. Relancez une migration.');
      setLegacyKeyInput('');
    } catch (e) {
      Alert.alert(t('common.error'), 'Impossible d\'ajouter la clé legacy');
    }
  };

  const runMigrationScan = async () => {
    try {
      setMigrationRunning(true);
      const result = await SecureCloudStorage.forceMigrationScan();
      setCorruptedCounts({ corrupted: result.corrupted, ignored: result.ignored });
      Alert.alert('Migration', `Cloud: ${result.totalCloud}\nCorrompus: ${result.corrupted}\nIgnorés: ${result.ignored}`);
    } catch (e) {
      Alert.alert(t('common.error'), 'Migration scan échoué');
    } finally {
      setMigrationRunning(false);
    }
  };
  
  const createRecoveryPhrase = async () => {
    try {
      // Générer une phrase de récupération de 12 mots
      const wordList = [
        'pomme', 'banane', 'cerise', 'date', 'sureau', 'figue',
        'raisin', 'miel', 'iris', 'jade', 'kiwi', 'citron',
        'mangue', 'noix', 'orange', 'poire', 'coing', 'framboise',
        'fraise', 'tomate', 'raisin', 'noix', 'xanthium', 'yaourt',
        'zeste', 'abricot', 'bleuet', 'canneberge', 'datte', 'figue'
      ];
      
      // Générer 12 mots aléatoires
      const phrase = Array(12)
        .fill(0)
        .map(() => wordList[Math.floor(Math.random() * wordList.length)])
        .join(' ');
      
      // Stocker localement dans un stockage sécurisé
      await SecureStore.setItemAsync(LOCAL_RECOVERY_PHRASE, phrase);
      setRecoveryPhraseCreated(true);
      
      // Sauvegarder la clé d'encryption (normalement avec la phrase comme protection)
      const key = await EncryptionService.exportEncryptionKey();
      
      // Ici, nous pourrions chiffrer la clé avec la phrase et la sauvegarder dans Firebase
      // Pour simplifier, nous montrons juste la phrase à l'utilisateur
      
      // Montrer la phrase de récupération à l'utilisateur
      Alert.alert(
        t('syncSettings.recoveryPhraseTitle'),
        t('syncSettings.recoveryPhraseMessage', { phrase }),
        [
          {
            text: t('syncSettings.phraseConfirm'),
            onPress: () => console.log('Phrase de récupération sauvegardée')
          }
        ]
      );
    } catch (error) {
      console.error('Échec de la création de la phrase de récupération:', error);
      Alert.alert(t('common.error'), t('syncSettings.recoveryPhraseError'));
    }
  };
  
  const showRecoveryPhrase = async () => {
    try {
      const phrase = await SecureStore.getItemAsync(LOCAL_RECOVERY_PHRASE);
      if (phrase) {
        Alert.alert(
          t('syncSettings.recoveryPhrase'),
          t('syncSettings.recoveryPhraseShow', { phrase }),
          [
            {
              text: t('common.ok'),
              onPress: () => console.log('Phrase de récupération consultée')
            }
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('syncSettings.noPhraseFound'));
      }
    } catch (error) {
      console.error('Échec de l\'affichage de la phrase de récupération:', error);
      Alert.alert(t('common.error'), t('syncSettings.showPhraseError'));
    }
  };
  
  const removeDevice = async (deviceId: string) => {
    try {
      await SecureCloudStorage.removeDevice(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
      Alert.alert(t('common.success'), t('syncSettings.deviceRemoved'));
    } catch (error) {
      console.error('Échec de la suppression de l\'appareil:', error);
      Alert.alert(t('common.error'), t('syncSettings.deviceRemoveError'));
    }
  };
  
  const confirmRemoveDevice = (device: {id: string; name: string}) => {
    Alert.alert(
      t('syncSettings.removeDevice'),
      t('syncSettings.removeDeviceConfirm', { name: device.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.remove'),
          onPress: () => removeDevice(device.id),
          style: 'destructive'
        }
      ]
    );
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
                
                {hasConflicts && (
                  <View style={styles.warningContainer}>
                    <AlertTriangle size={16} color="#FF6B35" />
                    <Text style={styles.warningText}>
                      {t('syncSettings.conflictsDetected')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('syncSettings.security')}</Text>
            </View>
            
            <Text style={styles.description}>
              {t('syncSettings.securityDescription')}
            </Text>
            
            <View style={styles.securityInfo}>
              <View style={styles.securityItem}>
                <Lock size={16} color="#667EEA" />
                <Text style={styles.securityText}>
                  {t('syncSettings.endToEndEncryption')}
                </Text>
              </View>
              
              <View style={styles.securityItem}>
                <Key size={16} color="#667EEA" />
                <Text style={styles.securityText}>
                  {t('syncSettings.uniqueEncryptionKey')}
                </Text>
              </View>
            </View>
            
            <View style={styles.recoverySection}>
              <Text style={styles.recoveryTitle}>
                {t('syncSettings.recoveryPhrase')}
              </Text>
              
              <Text style={styles.recoveryDescription}>
                {t('syncSettings.recoveryDescription')}
              </Text>
              
              {recoveryPhraseCreated ? (
                <TouchableOpacity
                  style={styles.recoveryButton}
                  onPress={showRecoveryPhrase}
                >
                  <Key size={18} color="#FFFFFF" />
                  <Text style={styles.recoveryButtonText}>
                    {t('syncSettings.viewRecoveryPhrase')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.recoveryButton}
                  onPress={createRecoveryPhrase}
                >
                  <Key size={18} color="#FFFFFF" />
                  <Text style={styles.recoveryButtonText}>
                    {t('syncSettings.createRecoveryPhrase')}
                  </Text>
                </TouchableOpacity>
              )}

              {recoveryPhraseCreated && (
                <>
                  <View style={styles.backupContainer}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, backupLoading && styles.disabledButton]}
                      disabled={backupLoading}
                      onPress={backupEncryptionKey}
                    >
                      {backupLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ShieldCheck size={18} color="#FFFFFF" />
                      )}
                      <Text style={styles.secondaryButtonText}>
                        {backupLoading ? t('syncSettings.backupInProgress') : t('syncSettings.backupKey')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.restoreBlock}>
                    <Text style={styles.restoreLabel}>{t('syncSettings.restoreKeyDescription')}</Text>
                    <TextInput
                      style={styles.phraseInput}
                      placeholder={t('syncSettings.enterPhrasePlaceholder')}
                      placeholderTextColor="#888"
                      multiline
                      value={phraseInput}
                      onChangeText={setPhraseInput}
                    />
                    <TouchableOpacity
                      style={[styles.secondaryOutlineButton, restoreLoading && styles.disabledOutlineButton]}
                      disabled={restoreLoading}
                      onPress={restoreEncryptionKey}
                    >
                      {restoreLoading ? (
                        <ActivityIndicator size="small" color="#667EEA" />
                      ) : (
                        <ShieldCheck size={18} color="#667EEA" />
                      )}
                      <Text style={styles.secondaryOutlineButtonText}>
                        {restoreLoading ? t('syncSettings.restoreInProgress') : t('syncSettings.restoreKey')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.migrationBlock}>
                    <Text style={styles.migrationTitle}>Migration & Clés legacy</Text>
                    <Text style={styles.migrationDesc}>Ajoutez une ancienne clé si certaines données historiques ne se déchiffrent plus, puis lancez un scan.</Text>
                    <TextInput
                      style={styles.legacyInput}
                      placeholder="Ancienne clé (optionnel)"
                      placeholderTextColor="#888"
                      value={legacyKeyInput}
                      onChangeText={setLegacyKeyInput}
                    />
                    <View style={styles.migrationButtonsRow}>
                      <TouchableOpacity
                        style={[styles.smallButton, !legacyKeyInput.trim() && styles.smallButtonDisabled]}
                        disabled={!legacyKeyInput.trim()}
                        onPress={addLegacyKey}
                      >
                        <Text style={styles.smallButtonText}>Ajouter clé</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallButtonOutline, migrationRunning && styles.smallButtonDisabled]}
                        disabled={migrationRunning}
                        onPress={runMigrationScan}
                      >
                        {migrationRunning ? <ActivityIndicator size="small" color="#667EEA" /> : <Text style={styles.smallButtonOutlineText}>Scan migration</Text>}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.migrationStats}>Corrompus détectés: {corruptedCounts.corrupted} • Ignorés: {corruptedCounts.ignored}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
          
          {syncEnabled && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Smartphone size={20} color="#667EEA" />
                <Text style={styles.sectionTitle}>{t('syncSettings.connectedDevices')}</Text>
              </View>
              
              {deviceLoading ? (
                <ActivityIndicator size="small" color="#667EEA" style={styles.deviceLoading} />
              ) : devices.length === 0 ? (
                <Text style={styles.emptyText}>{t('syncSettings.noDevices')}</Text>
              ) : (
                devices.map((device) => (
                  <View key={device.id} style={styles.deviceItem}>
                    <View style={styles.deviceInfo}>
                      <Smartphone size={18} color="#667EEA" />
                      <View style={styles.deviceDetails}>
                        <Text style={styles.deviceName}>
                          {device.name} {device.isCurrentDevice && `(${t('syncSettings.thisDevice')})`}
                        </Text>
                        <Text style={styles.deviceActive}>
                          {t('syncSettings.lastActive')}: {new Date(device.lastActive).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    
                    {!device.isCurrentDevice && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => confirmRemoveDevice(device)}
                      >
                        <X size={16} color="#F56565" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
              
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={loadDevices}
                disabled={deviceLoading}
              >
                {deviceLoading ? (
                  <ActivityIndicator size="small" color="#667EEA" />
                ) : (
                  <RefreshCcw size={16} color="#667EEA" />
                )}
                <Text style={styles.refreshText}>
                  {t('syncSettings.refreshDevices')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  },
  securityInfo: {
    marginVertical: 8
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6
  },
  securityText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8
  },
  recoverySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  recoveryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  recoveryButton: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10
  },
  recoveryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16
  },
  deviceLoading: {
    marginVertical: 16
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  deviceDetails: {
    marginLeft: 10,
    flex: 1
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333'
  },
  deviceActive: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 101, 101, 0.1)'
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 12
  },
  refreshText: {
    color: '#667EEA',
    marginLeft: 6,
    fontSize: 14
  },
  backupContainer: {
    marginTop: 16
  },
  secondaryButton: {
    backgroundColor: '#764BA2',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  disabledButton: {
    opacity: 0.6
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8
  },
  restoreBlock: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16
  },
  restoreLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8
  },
  phraseInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: 10,
    color: '#333',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    marginBottom: 12
  },
  secondaryOutlineButton: {
    borderWidth: 1,
    borderColor: '#667EEA',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.9)'
  },
  disabledOutlineButton: {
    opacity: 0.6
  },
  secondaryOutlineButtonText: {
    color: '#667EEA',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8
  },
  migrationBlock: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16
  },
  migrationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6
  },
  migrationDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 10,
    lineHeight: 18
  },
  legacyInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    color: '#333',
    marginBottom: 12
  },
  migrationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#764BA2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  smallButtonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#667EEA',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)'
  },
  smallButtonDisabled: {
    opacity: 0.5
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500'
  },
  smallButtonOutlineText: {
    color: '#667EEA',
    fontSize: 14,
    fontWeight: '500'
  },
  migrationStats: {
    fontSize: 12,
    color: '#555'
  }
});
