import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState, BackHandler, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAndroidDeviceInfo,
  triggerAndroidHaptics,
  showAndroidToast,
  checkAndroidPermissions,
} from '@/utils/androidOptimizations';
import { configureAndroidAccessibility } from '@/utils/accessibility';

interface AndroidState {
  isAndroid: boolean;
  deviceInfo: ReturnType<typeof getAndroidDeviceInfo> | null;
  appState: string;
  hasNotificationPermission: boolean;
  isFirstLaunch: boolean;
  keyboardVisible: boolean;
}

export const useAndroidOptimizations = () => {
  const [androidState, setAndroidState] = useState<AndroidState>({
    isAndroid: Platform.OS === 'android',
    deviceInfo: null,
    appState: 'active',
    hasNotificationPermission: false,
    isFirstLaunch: true,
    keyboardVisible: false,
  });

  const [isReady, setIsReady] = useState(false);

  // Initialisation Android
  const initializeAndroid = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setIsReady(true);
      return;
    }

    try {
      // Récupération des informations de l'appareil
      const deviceInfo = getAndroidDeviceInfo();

      // Vérification des permissions
      const hasPermission = await checkAndroidPermissions();

      // Vérification du premier lancement
      const isFirst = await AsyncStorage.getItem('first_launch');
      const isFirstLaunch = isFirst === null;

      if (isFirstLaunch) {
        await AsyncStorage.setItem('first_launch', 'false');
        showAndroidToast('Bienvenue dans Glucose Tracker!', 'LONG');
        triggerAndroidHaptics('success');
      }

      // Configuration de l'accessibilité
      await configureAndroidAccessibility();

      setAndroidState(prev => ({
        ...prev,
        deviceInfo,
        hasNotificationPermission: hasPermission,
        isFirstLaunch,
      }));

      setIsReady(true);
    } catch (error) {
      console.error('Erreur initialisation Android:', error);
      setIsReady(true);
    }
  }, []);

  // Gestion du bouton retour Android
  const setupBackHandler = useCallback((onBackPress?: () => boolean) => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBackPress) {
        return onBackPress();
      }

      // Comportement par défaut : demander confirmation pour quitter
      showAndroidToast('Appuyez à nouveau pour quitter', 'SHORT');
      triggerAndroidHaptics('light');

      setTimeout(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
          BackHandler.exitApp();
          return true;
        });

        setTimeout(() => subscription.remove(), 2000);
      }, 100);

      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Gestion de l'état de l'application
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handleAppStateChange = (nextAppState: string) => {
      setAndroidState(prev => ({ ...prev, appState: nextAppState }));

      if (nextAppState === 'active') {
        // L'app revient au premier plan
        triggerAndroidHaptics('light');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Gestion du clavier Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const keyboardDidShow = () => {
      setAndroidState(prev => ({ ...prev, keyboardVisible: true }));
    };

    const keyboardDidHide = () => {
      setAndroidState(prev => ({ ...prev, keyboardVisible: false }));
    };

    const showSubscription = Dimensions.addEventListener('change', ({ window }) => {
      // Détection du clavier basée sur la hauteur d'écran
      const isKeyboardVisible = window.height < 600;
      setAndroidState(prev => ({ ...prev, keyboardVisible: isKeyboardVisible }));
    });

    return () => {
      showSubscription?.remove();
    };
  }, []);

  // Initialisation au montage
  useEffect(() => {
    initializeAndroid();
  }, [initializeAndroid]);

  // Fonctions utilitaires
  const requestNotificationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return false;

    try {
      const hasPermission = await checkAndroidPermissions();
      setAndroidState(prev => ({
        ...prev,
        hasNotificationPermission: hasPermission
      }));
      return hasPermission;
    } catch (error) {
      console.error('Erreur demande permission:', error);
      return false;
    }
  }, []);

  const showToast = useCallback((message: string, duration: 'SHORT' | 'LONG' = 'SHORT') => {
    if (Platform.OS === 'android') {
      showAndroidToast(message, duration);
    }
  }, []);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (Platform.OS === 'android') {
      triggerAndroidHaptics(type);
    }
  }, []);

  const getOptimizedStyles = useCallback((baseStyles: any) => {
    if (Platform.OS !== 'android' || !androidState.deviceInfo) {
      return baseStyles;
    }

    const { isTablet, orientation } = androidState.deviceInfo;

    return {
      ...baseStyles,
      ...(isTablet && {
        paddingHorizontal: 32,
        fontSize: baseStyles.fontSize ? baseStyles.fontSize * 1.1 : undefined,
      }),
      ...(orientation === 'landscape' && {
        paddingVertical: baseStyles.paddingVertical ? baseStyles.paddingVertical * 0.8 : undefined,
      }),
    };
  }, [androidState.deviceInfo]);

  return {
    // État
    ...androidState,
    isReady,

    // Fonctions
    setupBackHandler,
    requestNotificationPermission,
    showToast,
    hapticFeedback,
    getOptimizedStyles,

    // Réinitialisation
    reinitialize: initializeAndroid,
  };
};
