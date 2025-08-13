import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { GlucoseUnit, convertGlucose } from '@/utils/units';
import { Globe, Paintbrush, Bell, Info, Clock, Languages, Cloud, LogIn, LogOut } from 'lucide-react-native';
import { useToast } from '@/hooks/useToast';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { userSettings, accessibilitySettings, updateUserSetting, updateAccessibilitySetting, isLoading } = useSettings();
  
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [unit, setUnit] = useState<GlucoseUnit>(userSettings.unit || 'mgdl');
  const [highContrast, setHighContrast] = useState(accessibilitySettings.highContrast || false);
  const [largeText, setLargeText] = useState(accessibilitySettings.largeText || false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(accessibilitySettings.screenReaderEnabled || false);
  const [cloudBackup, setCloudBackup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const toast = useToast();

  // Vérifier si la sauvegarde cloud est activée et si l'utilisateur est authentifié
  useEffect(() => {
    const checkCloudBackup = async () => {
      try {
        const enabled = await AsyncStorage.getItem('secure_cloud_sync_enabled');
        setCloudBackup(enabled === 'true');
        
        const authStatus = await AsyncStorage.getItem('user_authenticated');
        setIsAuthenticated(authStatus === 'true');
      } catch (error) {
        console.error('Erreur lors de la vérification de la sauvegarde cloud:', error);
      }
    };
    
    checkCloudBackup();
  }, []);
  
  // Changer la langue de l'application
  const handleChangeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguage(lng);
    updateUserSetting('language', lng);
  };

  // Changer l'unité de mesure
  const handleUnitChange = (newUnit: GlucoseUnit) => {
    if (newUnit === unit) return;
    
    // Convertir les cibles en changeant d'unité
    const targetMin = parseFloat(userSettings.targetMin);
    const targetMax = parseFloat(userSettings.targetMax);
    
    let newTargetMin: string = '';
    let newTargetMax: string = '';
    
    if (newUnit === 'mmoll' && unit === 'mgdl') {
      // Convertir de mg/dL à mmol/L
      newTargetMin = convertGlucose(targetMin, 'mgdl', 'mmoll').toFixed(1);
      newTargetMax = convertGlucose(targetMax, 'mgdl', 'mmoll').toFixed(1);
    } else if (newUnit === 'mgdl' && unit === 'mmoll') {
      // Convertir de mmol/L à mg/dL
      newTargetMin = Math.round(convertGlucose(targetMin, 'mmoll', 'mgdl')).toString();
      newTargetMax = Math.round(convertGlucose(targetMax, 'mmoll', 'mgdl')).toString();
    }
    
    setUnit(newUnit);
    updateUserSetting('unit', newUnit);
    updateUserSetting('targetMin', newTargetMin);
    updateUserSetting('targetMax', newTargetMax);
  };
  
  // Gérer l'authentification utilisateur pour la sauvegarde cloud
  const handleAuthentication = async () => {
    if (isAuthenticated) {
      // Déconnexion
      try {
        await AsyncStorage.setItem('user_authenticated', 'false');
        setIsAuthenticated(false);
        toast.show(
          t('settings.logout_success'),
          t('settings.logout_success_message')
        );
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        toast.show(
          t('settings.error'),
          t('settings.logout_error')
        );
      }
    } else {
      // Pour la connexion, simplement afficher une alerte car le login n'est pas implémenté
      toast.show(
        t('settings.login'),
        t('settings.login_required'),
        [
          { text: t('common.ok') }
        ]
      );
    }
  };

  const toggleHighContrast = async (value: boolean) => {
    setHighContrast(value);
    await updateAccessibilitySetting('highContrast', value);
  };

  const toggleLargeText = async (value: boolean) => {
    setLargeText(value);
    await updateAccessibilitySetting('largeText', value);
  };
  
  const toggleScreenReader = async (value: boolean) => {
    setScreenReaderEnabled(value);
    await updateAccessibilitySetting('screenReaderEnabled', value);
  };
  
  // Activer ou désactiver la sauvegarde cloud
  const toggleCloudBackup = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('secure_cloud_sync_enabled', value ? 'true' : 'false');
      setCloudBackup(value);
      
      if (value && !isAuthenticated) {
        toast.show(
          t('settings.cloud_backup'),
          t('settings.login_required'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel'
            },
            {
              text: t('settings.login'),
              onPress: () => toast.show(
                t('settings.login'),
                t('settings.login_required'),
                [{ text: t('common.ok') }]
              )
            }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur lors de la modification de la sauvegarde cloud:', error);
      toast.show(
        t('settings.error'),
        t('settings.cloud_backup_error')
      );
    }
  };

  // Pour ces fonctions de navigation, utilisons simplement des alertes 
  // car les écrans ne sont pas implémentés dans la structure d'app actuelle
  const navigateToProfile = () => {
    toast.show(t('settings.profile'), t('common.feature_coming_soon'));
  };

  const navigateToTargets = () => {
    toast.show(t('settings.targets'), t('common.feature_coming_soon'));
  };

  const navigateToNotifications = () => {
    toast.show(t('settings.notifications'), t('common.feature_coming_soon'));
  };
  
  const navigateToSyncSettings = () => {
    toast.show(t('settings.cloud_backup'), t('common.feature_coming_soon'));
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#667EEA', '#764BA2', '#F093FB']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
        </LinearGradient>
        
        <View style={styles.content}>
          {/* Profile Section */}
          <TouchableOpacity 
            style={styles.section}
            onPress={navigateToProfile}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Globe size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.profileNote')}
            </Text>
          </TouchableOpacity>
          
          {/* Cloud Backup Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Cloud size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.cloudBackup')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.cloudBackupDescription')}
            </Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>{t('settings.enableSync')}</Text>
              <Switch
                value={cloudBackup}
                onValueChange={toggleCloudBackup}
                trackColor={{ false: '#D1D5DB', true: '#667EEA' }}
                thumbColor={cloudBackup ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuthentication}
            >
              <View style={styles.authButtonContent}>
                {isAuthenticated ? (
                  <LogOut size={20} color="#FFFFFF" />
                ) : (
                  <LogIn size={20} color="#FFFFFF" />
                )}
                <Text style={styles.authButtonText}>
                  {isAuthenticated 
                    ? t('settings.logout')
                    : t('settings.login')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Targets Section */}
          <TouchableOpacity 
            style={styles.section}
            onPress={navigateToTargets}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Info size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.targets')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.targetsDescription', { unit: t(`settings.unitsOptions.${unit}`) })}
            </Text>
            <View style={styles.targetsPreview}>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>{t('settings.targetMin')}</Text>
                <Text style={styles.targetValue}>{userSettings.targetMin} {unit === 'mgdl' ? 'mg/dL' : 'mmol/L'}</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>{t('settings.targetMax')}</Text>
                <Text style={styles.targetValue}>{userSettings.targetMax} {unit === 'mgdl' ? 'mg/dL' : 'mmol/L'}</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Units Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Clock size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.units')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.unitsDescription')}
            </Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.radioOption, unit === 'mgdl' && styles.radioSelected]}
                onPress={() => handleUnitChange('mgdl')}
              >
                <View style={[styles.radioCircle, unit === 'mgdl' && styles.radioCircleSelected]}>
                  {unit === 'mgdl' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>mg/dL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioOption, unit === 'mmoll' && styles.radioSelected]}
                onPress={() => handleUnitChange('mmoll')}
              >
                <View style={[styles.radioCircle, unit === 'mmoll' && styles.radioCircleSelected]}>
                  {unit === 'mmoll' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>mmol/L</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Language Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Languages size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.languageDescription')}
            </Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.radioOption, language === 'fr' && styles.radioSelected]}
                onPress={() => handleChangeLanguage('fr')}
              >
                <View style={[styles.radioCircle, language === 'fr' && styles.radioCircleSelected]}>
                  {language === 'fr' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Français</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioOption, language === 'en' && styles.radioSelected]}
                onPress={() => handleChangeLanguage('en')}
              >
                <View style={[styles.radioCircle, language === 'en' && styles.radioCircleSelected]}>
                  {language === 'en' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>English</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Notifications Section */}
          <TouchableOpacity 
            style={styles.section}
            onPress={navigateToNotifications}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Bell size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.notificationsDescription')}
            </Text>
          </TouchableOpacity>
          
          {/* Accessibility Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Paintbrush size={24} color="#667EEA" />
              </View>
              <Text style={styles.sectionTitle}>{t('settings.accessibility')}</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {t('settings.accessibilityDescription')}
            </Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>{t('settings.highContrast')}</Text>
              <Switch
                value={highContrast}
                onValueChange={toggleHighContrast}
                trackColor={{ false: '#D1D5DB', true: '#667EEA' }}
                thumbColor={highContrast ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>{t('settings.largeText')}</Text>
              <Switch
                value={largeText}
                onValueChange={toggleLargeText}
                trackColor={{ false: '#D1D5DB', true: '#667EEA' }}
                thumbColor={largeText ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>{t('settings.screenReader')}</Text>
              <Switch
                value={screenReaderEnabled}
                onValueChange={toggleScreenReader}
                trackColor={{ false: '#D1D5DB', true: '#667EEA' }}
                thumbColor={screenReaderEnabled ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>GlycoFlex v1.0.0</Text>
            <Text style={styles.footerCopyright}>© 2023 GlycoFlex</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  radioGroup: {
    marginTop: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: '#667EEA',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#667EEA',
  },
  radioText: {
    fontSize: 16,
    color: '#374151',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingText: {
    fontSize: 16,
    color: '#374151',
  },
  targetsPreview: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-around',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  authButton: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});
