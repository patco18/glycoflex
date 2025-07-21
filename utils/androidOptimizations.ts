import { Platform, BackHandler, ToastAndroid, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/utils/logger';

// Configuration spécifique Android
export const AndroidConfig = {
  isAndroid: Platform.OS === 'android',
  minSdkVersion: 23,
  targetSdkVersion: 34,
};

// Gestion du bouton retour Android
export const setupAndroidBackHandler = (onBackPress?: () => boolean) => {
  if (!AndroidConfig.isAndroid) return;

  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (onBackPress) {
      return onBackPress();
    }
    return false;
  });

  return () => backHandler.remove();
};

// Toast natif Android
export const showAndroidToast = (message: string, duration: 'SHORT' | 'LONG' = 'SHORT') => {
  if (AndroidConfig.isAndroid) {
    ToastAndroid.show(message, duration === 'SHORT' ? ToastAndroid.SHORT : ToastAndroid.LONG);
  }
};

// Feedback haptique optimisé pour Android
export const triggerAndroidHaptics = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
  if (!AndroidConfig.isAndroid) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    console.warn('Erreur feedback haptique:', error);
  }
};

// Détection des spécificités Android
export const getAndroidDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const screenData = Dimensions.get('screen');

  return {
    screenWidth: width,
    screenHeight: height,
    pixelRatio: screenData.scale,
    hasNotch: height > 800 && width / height < 0.5, // Estimation basique
    isTablet: width > 768,
    orientation: width > height ? 'landscape' : 'portrait'
  };
};

// Gestion des notifications Android avec canaux
export const setupAndroidNotificationChannels = async () => {
  if (!AndroidConfig.isAndroid) return;

  try {
    // Canal pour les rappels de mesure
    await Notifications.setNotificationChannelAsync('glucose-reminders', {
      name: 'Rappels de glycémie',
      description: 'Notifications pour vous rappeler de mesurer votre glycémie',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667EEA',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    // Canal pour les alertes urgentes
    await Notifications.setNotificationChannelAsync('glucose-alerts', {
      name: 'Alertes glycémie',
      description: 'Alertes importantes pour des valeurs de glycémie anormales',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF4444',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    // Canal pour les rappels généraux
    await Notifications.setNotificationChannelAsync('general', {
      name: 'Notifications générales',
      description: 'Informations générales de l\'application',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

  } catch (error) {
    logger.error('Erreur lors de la configuration des canaux de notification:', error);
  }
};

// Optimisation de la performance pour Android
export const optimizeAndroidPerformance = async () => {
  if (!AndroidConfig.isAndroid) return;

  try {
    // Configuration du cache
    await AsyncStorage.setItem('android_perf_optimized', 'true');

    // Désactiver les animations si l'appareil est lent
    const deviceInfo = getAndroidDeviceInfo();
    if (deviceInfo.screenWidth < 400 || deviceInfo.pixelRatio < 2) {
      await AsyncStorage.setItem('reduce_animations', 'true');
    }
  } catch (error) {
    logger.error('Erreur optimisation performance:', error);
  }
};

// Gestion de l'état de l'application Android
export const handleAndroidAppState = (state: string) => {
  if (!AndroidConfig.isAndroid) return;

  switch (state) {
    case 'active':
      // L'app est au premier plan
      break;
    case 'background':
      // L'app est en arrière-plan
      break;
    case 'inactive':
      // L'app est inactive (transition)
      break;
  }
};

// Vérification des permissions spécifiques Android
export const checkAndroidPermissions = async () => {
  if (!AndroidConfig.isAndroid) return true;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Erreur vérification permissions:', error);
    return false;
  }
};

// Adaptation du thème pour Android Material Design
export const getAndroidMaterialTheme = (isDark: boolean = false) => {
  const baseTheme = {
    primary: '#667EEA',
    primaryVariant: '#5A67D8',
    secondary: '#48BB78',
    secondaryVariant: '#38A169',
    background: isDark ? '#121212' : '#FFFFFF',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    error: '#F56565',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: isDark ? '#FFFFFF' : '#000000',
    onSurface: isDark ? '#FFFFFF' : '#000000',
    onError: '#FFFFFF',
  };

  return {
    ...baseTheme,
    elevation: {
      level1: isDark ? '#1E1E1E' : '#FFFFFF',
      level2: isDark ? '#232323' : '#F7FAFC',
      level3: isDark ? '#252525' : '#EDF2F7',
      level4: isDark ? '#272727' : '#E2E8F0',
      level5: isDark ? '#2C2C2C' : '#CBD5E0',
    },
    shapes: {
      cornerRadius: {
        small: 4,
        medium: 8,
        large: 16,
      }
    }
  };
};
