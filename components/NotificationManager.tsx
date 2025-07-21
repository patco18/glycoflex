import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Bell, BellOff, Clock, Smartphone } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  showAndroidToast,
  triggerAndroidHaptics,
  getAndroidMaterialTheme,
  checkAndroidPermissions
} from '@/utils/androidOptimizations';
import logger from '@/utils/logger';

// Import direct des notifications - si elles ne sont pas disponibles, gérer les cas d'erreur gracieusement
import * as ExpoNotifications from 'expo-notifications';

// Vérifier si ExpoNotifications est disponible et utilisable
const Notifications = ExpoNotifications && typeof ExpoNotifications === 'object' && Object.keys(ExpoNotifications).length > 0 ? ExpoNotifications : null;

// Afficher un avertissement si les notifications ne sont pas disponibles
if (!Notifications) {
  logger.warn("Expo-notifications n'est pas disponible sur cette plateforme.");
}

// Configuration des notifications avec canaux Android si disponible
if (Notifications) {
  try {
    // Vérifier si la méthode setNotificationHandler existe
    if (typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          const response = {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
            priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.HIGH : undefined,
          } as ExpoNotifications.NotificationBehavior;
          
          return response;
        },
      });
    } else {
      logger.warn('Notifications.setNotificationHandler is not a function');
    }
  } catch (error) {
    logger.warn('Error configuring notification handler:', error);
  }
}

// Export pour être utilisé ailleurs dans l'application
export const sendGlucoseAlert = async (value: number, type: 'low' | 'high') => {
  try {
    if (Notifications) {
      const title = type === 'low' 
        ? 'Alerte glycémie basse' 
        : 'Alerte glycémie élevée';
        
      const body = type === 'low'
        ? `Votre glycémie est basse: ${value} mg/dL. Prenez des glucides rapides.`
        : `Votre glycémie est élevée: ${value} mg/dL. Vérifiez votre traitement.`;
        
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null,
      });
    } else {
      // Fallback si les notifications ne sont pas disponibles
      logger.warn(`Alert glycémie ${type}: ${value} mg/dL`);
      if (Platform.OS === 'android') {
        showAndroidToast(type === 'low' 
          ? `Glycémie basse: ${value} mg/dL` 
          : `Glycémie élevée: ${value} mg/dL`);
      }
    }
  } catch (error) {
    logger.warn('Failed to send glucose alert notification', error);
  }
};

interface NotificationSettings {
  enabled: boolean;
  reminderTimes: string[];
  urgentAlerts: boolean;
  androidChannelPrefs: {
    vibration: boolean;
    sound: boolean;
    lights: boolean;
  };
}

export default function NotificationManager() {
  // Utilisation du state pour gérer les paramètres de notification
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    reminderTimes: ['08:00', '12:00', '18:00'],
    urgentAlerts: true,
    androidChannelPrefs: {
      vibration: true,
      sound: true,
      lights: true,
    },
  });
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const materialTheme = getAndroidMaterialTheme();

  useEffect(() => {
    loadSettings();
    checkPermissions();

    // Configuration spécifique Android
    if (Platform.OS === 'android') {
      setupAndroidNotificationBehavior();
    }
  }, []);

  const setupAndroidNotificationBehavior = async () => {
    try {
      // Configuration des canaux Android déjà définis dans androidOptimizations.ts
      // Ajout d'un listener pour les interactions avec les notifications
      if (!Notifications) {
        logger.warn('Notifications not available for setting up Android behavior');
        return () => {}; // Retourner une fonction de nettoyage vide
      }

      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const { notification, actionIdentifier } = response;

        if (Platform.OS === 'android') {
          triggerAndroidHaptics('light');

          // Actions spécifiques selon le type de notification
          if (notification.request.content.categoryIdentifier === 'glucose-reminder') {
            // Ouvrir directement l'écran d'ajout
            showAndroidToast('Ouverture de l\'ajout de mesure', 'SHORT');
          }
        }
      });

      return () => subscription.remove();
    } catch (error) {
      logger.error('Erreur configuration notifications Android:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('notificationSettings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des paramètres de notification:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);

      // Feedback Android
      if (Platform.OS === 'android') {
        triggerAndroidHaptics('success');
        showAndroidToast('Paramètres sauvegardés', 'SHORT');
      }
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await checkAndroidPermissions();
        setPermissionStatus(hasPermission ? 'granted' : 'denied');
      } else if (Notifications) {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
      } else {
        // Aucun moyen de vérifier les permissions
        setPermissionStatus('unavailable');
      }
    } catch (error) {
      logger.error('Erreur vérification permissions:', error);
      setPermissionStatus('denied');
    }
  };

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        triggerAndroidHaptics('medium');
      }

      // Vérifiez si Notifications est disponible
      if (!Notifications) {
        logger.warn('Notifications not available for requesting permissions');
        setPermissionStatus('unavailable');
        if (Platform.OS === 'android') {
          showAndroidToast('Notifications non disponibles', 'LONG');
        }
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      setPermissionStatus(status);

      if (status === 'granted') {
        if (Platform.OS === 'android') {
          showAndroidToast('Notifications autorisées', 'SHORT');
          triggerAndroidHaptics('success');
        }
      } else if (Platform.OS === 'android') {
        showAndroidToast('Permissions refusées', 'LONG');
        triggerAndroidHaptics('error');
      }
    } catch (error) {
      logger.error('Erreur demande permissions:', error);
    }
  };

  const scheduleNotification = async (title: string, body: string, channelId: string = 'glucose-reminders') => {
    try {
      if (!Notifications) {
        logger.warn('Notifications not available for scheduling');
        if (Platform.OS === 'android') {
          showAndroidToast('Notifications non disponibles', 'SHORT');
        }
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: settings.androidChannelPrefs.sound,
          priority: Platform.OS === 'android' && Notifications ? Notifications.AndroidNotificationPriority.HIGH : undefined,
          categoryIdentifier: channelId,
          ...(Platform.OS === 'android' && {
            channelId,
            vibrationPattern: settings.androidChannelPrefs.vibration ? [0, 250, 250, 250] : undefined,
            color: materialTheme.primary,
            badge: 1,
          }),
        },
        trigger: null, // Déclencher immédiatement
      });

      if (Platform.OS === 'android') {
        showAndroidToast('Notification programmée', 'SHORT');
        triggerAndroidHaptics('success');
      }
    } catch (error) {
      logger.error('Erreur programmation notification:', error);
    }
  };

  const toggleNotifications = async () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    await saveSettings(newSettings);
  };

  const sendUrgentAlert = async (value: number, status: 'low' | 'high') => {
    if (!settings.urgentAlerts || permissionStatus !== 'granted') {
      return;
    }

    if (!Notifications) {
      logger.warn('Notifications not available for urgent alerts');
      return;
    }

    const messages = {
      low: {
        title: '⚠️ Glycémie Basse',
        body: `Attention: ${value} mg/dL - Consommez des glucides rapidement`,
      },
      high: {
        title: '⚠️ Glycémie Élevée',
        body: `Attention: ${value} mg/dL - Consultez votre médecin`,
      },
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: messages[status].title,
        body: messages[status].body,
        sound: true,
        priority: Notifications ? Notifications.AndroidNotificationPriority.MAX : undefined,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Notification immédiate
    });
  };

  // Si les notifications ne sont pas disponibles, renvoyer null pour ne pas afficher le composant
  if (!Notifications) {
    logger.warn('Notifications not available, NotificationManager will not render');
    return null;
  }

  return (
    <View style={[
      styles.container,
      Platform.OS === 'android' && {
        backgroundColor: materialTheme.surface,
        elevation: 2,
        borderRadius: materialTheme.shapes.cornerRadius.medium,
        margin: 16,
      }
    ]}>
      <View style={styles.header}>
        <Text style={[
          styles.title,
          Platform.OS === 'android' && {
            color: materialTheme.onSurface,
            fontSize: 18,
            fontWeight: '500',
          }
        ]}>
          Notifications
        </Text>
        {Platform.OS === 'android' && (
          <Smartphone size={20} color={materialTheme.primary} />
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.toggleButton,
          Platform.OS === 'android' && {
            backgroundColor: settings.enabled ? materialTheme.primary : materialTheme.elevation.level2,
            borderRadius: materialTheme.shapes.cornerRadius.large,
            elevation: settings.enabled ? 4 : 0,
          }
        ]}
        onPress={toggleNotifications}
        activeOpacity={0.7}
      >
        {settings.enabled ? (
          <Bell size={24} color={Platform.OS === 'android' ? materialTheme.onPrimary : '#667EEA'} />
        ) : (
          <BellOff size={24} color={Platform.OS === 'android' ? materialTheme.onSurface : '#A0AEC0'} />
        )}
        <Text style={[
          styles.toggleText,
          Platform.OS === 'android' && {
            color: settings.enabled ? materialTheme.onPrimary : materialTheme.onSurface,
            fontSize: 16,
            fontWeight: '500',
          }
        ]}>
          {settings.enabled ? 'Activées' : 'Désactivées'}
        </Text>
      </TouchableOpacity>

      {permissionStatus !== 'granted' && (
        <TouchableOpacity
          style={[
            styles.permissionButton,
            Platform.OS === 'android' && {
              backgroundColor: materialTheme.secondary,
              borderRadius: materialTheme.shapes.cornerRadius.medium,
              elevation: 2,
            }
          ]}
          onPress={requestPermissions}
        >
          <Text style={[
            styles.permissionText,
            Platform.OS === 'android' && {
              color: materialTheme.onSecondary,
              fontWeight: '500',
            }
          ]}>
            Autoriser les notifications
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.testButton,
          Platform.OS === 'android' && {
            borderColor: materialTheme.primary,
            borderRadius: materialTheme.shapes.cornerRadius.medium,
          }
        ]}
        onPress={() => scheduleNotification('Test', 'Notification de test pour Android')}
      >
        <Clock size={20} color={materialTheme.primary} />
        <Text style={[
          styles.testText,
          Platform.OS === 'android' && { color: materialTheme.primary }
        ]}>
          Tester les notifications
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#667EEA',
    borderRadius: 8,
    marginBottom: 12,
  },
  toggleText: {
    marginLeft: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  permissionButton: {
    padding: 12,
    backgroundColor: '#48BB78',
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#667EEA',
    borderRadius: 8,
  },
  testText: {
    marginLeft: 8,
    color: '#667EEA',
    fontSize: 16,
  },
});