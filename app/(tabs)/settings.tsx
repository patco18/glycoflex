import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'expo-linear-gradient';
import { User, Target, Bell, Info, Save, Globe, Accessibility, Clock, Cloud, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/SettingsContext';
import { useSyncContext } from '@/contexts/SyncContext';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const {
    userSettings,
    accessibilitySettings,
    updateUserSetting,
    updateAccessibilitySetting,
    isLoading
  } = useSettings();
  const { 
    isSyncEnabled, 
    toggleSync, 
    syncNow, 
    syncStatus, 
    isAuthenticated,
    signIn,
    signUp,
    signOut
  } = useSyncContext();
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthForm, setShowAuthForm] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      Alert.alert(t('common.success'), 'Paramètres sauvegardés');
    } catch (error) {
      Alert.alert(t('common.error'), 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const changeLanguage = async (language: string) => {
    await updateUserSetting('language', language);
  };

  const ranges = {
    fasting: { min: 70, max: 110 },
    postMeal: { min: 80, max: 140 },
    random: { min: 70, max: 140 },
    low: 70,
    high: 140,
  };
  const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';

  if (isLoading) {
    return <View style={styles.loadingContainer}><Text>{t('common.loading')}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2', '#F093FB']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('settings.name')}</Text>
              <TextInput
                style={styles.input}
                value={userSettings.name}
                onChangeText={(value) => updateUserSetting('name', value)}
                placeholder={t('settings.name')}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('settings.age')}</Text>
              <TextInput
                style={styles.input}
                value={userSettings.age}
                onChangeText={(value) => updateUserSetting('age', value)}
                placeholder={t('settings.age')}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.targets')}</Text>
            </View>
            
            <Text style={styles.sectionDescription}>
              {t('settings.targetsDescription', { unit: unitLabel })}
            </Text>

            <View style={styles.rangeContainer}>
              <View style={styles.rangeInput}>
                <Text style={styles.label}>{t('settings.minimum')}</Text>
                <TextInput
                  style={styles.input}
                  value={userSettings.targetMin}
                  onChangeText={(value) => updateUserSetting('targetMin', value)}
                  placeholder={ranges.low.toString()}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Text style={styles.rangeSeparator}>-</Text>
              <View style={styles.rangeInput}>
                <Text style={styles.label}>{t('settings.maximum')}</Text>
                <TextInput
                  style={styles.input}
                  value={userSettings.targetMax}
                  onChangeText={(value) => updateUserSetting('targetMax', value)}
                  placeholder={ranges.high.toString()}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
            </View>
            
            <View style={styles.languageContainer}>
              <TouchableOpacity
                style={[styles.languageButton, userSettings.language === 'fr' && styles.languageButtonActive]}
                onPress={() => changeLanguage('fr')}
              >
                <Text style={[styles.languageText, userSettings.language === 'fr' && styles.languageTextActive]}>
                  {t('settings.languages.fr')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.languageButton, userSettings.language === 'en' && styles.languageButtonActive]}
                onPress={() => changeLanguage('en')}
              >
                <Text style={[styles.languageText, userSettings.language === 'en' && styles.languageTextActive]}>
                  {t('settings.languages.en')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.units')}</Text>
            </View>
            
            <View style={styles.unitContainer}>
              <TouchableOpacity
                style={[styles.unitButton, userSettings.unit === 'mgdl' && styles.unitButtonActive]}
                onPress={() => updateUserSetting('unit', 'mgdl')}
              >
                <Text style={[styles.unitText, userSettings.unit === 'mgdl' && styles.unitTextActive]}>
                  {t('settings.units.mgdl')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, userSettings.unit === 'mmoll' && styles.unitButtonActive]}
                onPress={() => updateUserSetting('unit', 'mmoll')}
              >
                <Text style={[styles.unitText, userSettings.unit === 'mmoll' && styles.unitTextActive]}>
                  {t('settings.units.mmoll')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Accessibility size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.accessibility')}</Text>
            </View>
            
            <View style={styles.accessibilityOption}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionLabel}>{t('settings.highContrast')}</Text>
              </View>
              <Switch
                value={accessibilitySettings.highContrast}
                onValueChange={(value) => updateAccessibilitySetting('highContrast', value)}
                trackColor={{ false: '#CBD5E0', true: '#667EEA' }}
                thumbColor={accessibilitySettings.highContrast ? '#FFFFFF' : '#F7FAFC'}
              />
            </View>

            <View style={styles.accessibilityOption}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionLabel}>{t('settings.largeText')}</Text>
              </View>
              <Switch
                value={accessibilitySettings.largeText}
                onValueChange={(value) => updateAccessibilitySetting('largeText', value)}
                trackColor={{ false: '#CBD5E0', true: '#667EEA' }}
                thumbColor={accessibilitySettings.largeText ? '#FFFFFF' : '#F7FAFC'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => updateUserSetting('notifications', !userSettings.notifications)}
            >
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleLabel}>{t('settings.reminders')}</Text>
                <Text style={styles.toggleDescription}>
                  {t('settings.remindersDescription')}
                </Text>
              </View>
              <Switch
                value={userSettings.notifications}
                onValueChange={(value) => updateUserSetting('notifications', value)}
                trackColor={{ false: '#CBD5E0', true: '#667EEA' }}
                thumbColor={userSettings.notifications ? '#FFFFFF' : '#F7FAFC'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Cloud size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.cloudSync')}</Text>
            </View>

            <View style={styles.cloudSyncContainer}>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleLabel}>{t('settings.enableSync')}</Text>
                  <Text style={styles.toggleDescription}>
                    {t('settings.syncDescription')}
                  </Text>
                </View>
                <Switch
                  value={isSyncEnabled}
                  onValueChange={toggleSync}
                  trackColor={{ false: '#CBD5E0', true: '#667EEA' }}
                  thumbColor={isSyncEnabled ? '#FFFFFF' : '#F7FAFC'}
                  disabled={!isAuthenticated}
                />
              </View>

              {!isAuthenticated ? (
                <View style={styles.authContainer}>
                  {showAuthForm ? (
                    <>
                      <TextInput
                        style={styles.authInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <TextInput
                        style={styles.authInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mot de passe"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                      />
                      <View style={styles.authButtonsRow}>
                        <TouchableOpacity
                          style={[styles.authButton, styles.authButtonPrimary]}
                          onPress={async () => {
                            try {
                              await signIn(email, password);
                              setShowAuthForm(false);
                            } catch (error) {
                              Alert.alert("Erreur", "Connexion impossible. Vérifiez vos identifiants.");
                            }
                          }}
                        >
                          <Text style={styles.authButtonTextPrimary}>Se connecter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.authButton, styles.authButtonSecondary]}
                          onPress={async () => {
                            try {
                              await signUp(email, password);
                              setShowAuthForm(false);
                            } catch (error) {
                              Alert.alert("Erreur", "Inscription impossible. Essayez un autre email.");
                            }
                          }}
                        >
                          <Text style={styles.authButtonTextSecondary}>S'inscrire</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowAuthForm(false)}
                      >
                        <Text style={styles.cancelButtonText}>Annuler</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={() => setShowAuthForm(true)}
                    >
                      <Text style={styles.connectButtonText}>Se connecter pour activer la synchronisation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.syncStatusContainer}>
                  <View style={styles.syncInfoRow}>
                    <Text style={styles.syncLabel}>Dernière synchronisation:</Text>
                    <Text style={styles.syncValue}>
                      {syncStatus.lastSyncDate 
                        ? new Date(syncStatus.lastSyncDate).toLocaleString()
                        : "Jamais"}
                    </Text>
                  </View>

                  {syncStatus.pendingChanges > 0 && (
                    <View style={styles.syncInfoRow}>
                      <Text style={styles.syncLabel}>Modifications en attente:</Text>
                      <Text style={styles.syncPendingCount}>{syncStatus.pendingChanges}</Text>
                    </View>
                  )}

                  <View style={styles.syncActionRow}>
                    <TouchableOpacity 
                      style={styles.syncNowButton}
                      onPress={async () => {
                        try {
                          await syncNow();
                          Alert.alert("Succès", "Synchronisation terminée avec succès");
                        } catch (error) {
                          Alert.alert("Erreur", "Problème lors de la synchronisation");
                        }
                      }}
                      disabled={syncStatus.isSyncing}
                    >
                      <RefreshCw size={16} color="#FFFFFF" />
                      <Text style={styles.syncNowText}>
                        {syncStatus.isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.signOutButton}
                      onPress={async () => {
                        try {
                          await signOut();
                          Alert.alert("Déconnexion", "Vous avez été déconnecté");
                        } catch (error) {
                          Alert.alert("Erreur", "Problème lors de la déconnexion");
                        }
                      }}
                    >
                      <Text style={styles.signOutText}>Déconnexion</Text>
                    </TouchableOpacity>
                  </View>

                  {syncStatus.isSyncing && (
                    <ActivityIndicator size="small" color="#667EEA" style={styles.syncLoader} />
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={20} color="#667EEA" />
              <Text style={styles.sectionTitle}>{t('settings.info')}</Text>
            </View>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>{t('settings.normalRanges')}</Text>
              <Text style={styles.infoText}>
                {t('settings.fasting', { min: ranges.fasting.min, max: ranges.fasting.max, unit: unitLabel })}
              </Text>
              <Text style={styles.infoText}>
                {t('settings.postMeal', { min: ranges.postMeal.min, max: ranges.postMeal.max, unit: unitLabel })}
              </Text>
              <Text style={styles.infoText}>
                {t('settings.random', { min: ranges.random.min, max: ranges.random.max, unit: unitLabel })}
              </Text>
              
              <Text style={styles.warningText}>
                {t('settings.warning')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveSettings}
            disabled={saving}
          >
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {saving ? t('common.loading') : t('common.save')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#667EEA',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Styles pour la synchronisation cloud
  cloudSyncContainer: {
    marginVertical: 8,
  },
  authContainer: {
    marginTop: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 16,
  },
  authInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  authButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonPrimary: {
    backgroundColor: '#667EEA',
    marginRight: 6,
  },
  authButtonSecondary: {
    backgroundColor: '#E2E8F0',
    marginLeft: 6,
  },
  authButtonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authButtonTextSecondary: {
    color: '#4A5568',
    fontWeight: '600',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#718096',
  },
  connectButton: {
    backgroundColor: '#667EEA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  syncStatusContainer: {
    marginTop: 16,
  },
  syncInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncLabel: {
    color: '#4A5568',
    fontSize: 14,
  },
  syncValue: {
    color: '#2D3748',
    fontSize: 14,
    fontWeight: '500',
  },
  syncPendingCount: {
    color: '#DD6B20',
    fontWeight: '600',
    fontSize: 14,
  },
  syncActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  syncNowButton: {
    flexDirection: 'row',
    backgroundColor: '#667EEA',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
    marginRight: 8,
  },
  syncNowText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  signOutText: {
    color: '#4A5568',
    fontWeight: '500',
  },
  syncLoader: {
    marginTop: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeInput: {
    flex: 1,
  },
  rangeSeparator: {
    fontSize: 18,
    color: '#718096',
    marginHorizontal: 16,
    marginTop: 24,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#667EEA',
  },
  languageText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#667EEA',
  },
  unitText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  accessibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#2D3748',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLeft: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#718096',
  },
  infoContainer: {
    backgroundColor: '#E6FFFA',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#667EEA',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});