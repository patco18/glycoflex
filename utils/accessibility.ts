import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Platform } from 'react-native';
import { showAndroidToast, triggerAndroidHaptics } from './androidOptimizations';
import logger from '@/utils/logger';

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReaderEnabled: boolean;
  reduceMotion: boolean;
}

const ACCESSIBILITY_STORAGE_KEY = 'accessibility_settings';

// Chargement des paramètres d'accessibilité
export const loadAccessibilitySettings = async (): Promise<AccessibilitySettings> => {
  try {
    const stored = await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    const defaultSettings: AccessibilitySettings = {
      highContrast: false,
      largeText: false,
      screenReaderEnabled: false,
      reduceMotion: false,
    };
    
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
    
    // Détection automatique des paramètres système
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
    
    return {
      ...defaultSettings,
      screenReaderEnabled,
      reduceMotion: reduceMotionEnabled,
    };
  } catch (error) {
    logger.error('Erreur lors du chargement des paramètres d\'accessibilité:', error);
    return {
      highContrast: false,
      largeText: false,
      screenReaderEnabled: false,
      reduceMotion: false,
    };
  }
};

// Sauvegarde des paramètres d'accessibilité
export const saveAccessibilitySettings = async (settings: AccessibilitySettings) => {
  try {
    await AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde des paramètres d\'accessibilité:', error);
  }
};

// Support Android TalkBack amélioré
export const configureAndroidAccessibility = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Vérifier si TalkBack est activé
    const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

    if (isScreenReaderEnabled) {
      // Configuration spéciale pour TalkBack
      await AsyncStorage.setItem('talkback_enabled', 'true');

      // Annoncer l'activation
      AccessibilityInfo.announceForAccessibility(
        'Application de suivi de glycémie prête. Navigation optimisée pour TalkBack.'
      );
    }

    // Écouter les changements d'état de TalkBack
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        if (isEnabled) {
          showAndroidToast('TalkBack activé - Interface adaptée', 'LONG');
          AccessibilityInfo.announceForAccessibility('TalkBack activé');
        }
      }
    );

    return subscription;
  } catch (error) {
    logger.error('Erreur configuration accessibilité Android:', error);
  }
};

// Labels d'accessibilité spécifiques Android
export const getAndroidAccessibilityProps = (
  label: string,
  hint?: string,
  role?: string
) => {
  if (Platform.OS !== 'android') {
    return {
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: role,
    };
  }

  return {
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
    accessible: true,
    importantForAccessibility: 'yes' as const,
    // Propriétés spécifiques Android
    accessibilityLiveRegion: 'polite' as const,
    accessibilityElementsHidden: false,
  };
};

// Gestion des gestes d'accessibilité Android
export const handleAndroidAccessibilityGestures = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onDoubleTap?: () => void
) => {
  if (Platform.OS !== 'android') return {};

  return {
    onAccessibilityAction: (event: any) => {
      switch (event.nativeEvent.actionName) {
        case 'swipeLeft':
          onSwipeLeft?.();
          triggerAndroidHaptics('light');
          break;
        case 'swipeRight':
          onSwipeRight?.();
          triggerAndroidHaptics('light');
          break;
        case 'doubleTap':
          onDoubleTap?.();
          triggerAndroidHaptics('medium');
          break;
      }
    },
  };
};

// Styles pour les utilisateurs Android avec besoins spéciaux
export const getAndroidInclusiveStyles = (settings: AccessibilitySettings) => {
  if (Platform.OS !== 'android') return {};

  return {
    ...(settings.highContrast && {
      backgroundColor: '#000000',
      borderColor: '#FFFFFF',
      borderWidth: 2,
    }),
    ...(settings.largeText && {
      minHeight: 48, // Taille minimum recommandée Android
      paddingVertical: 12,
    }),
    ...(settings.reduceMotion && {
      animationDuration: 0,
      transitionDuration: 0,
    }),
  };
};

// Styles pour le contraste élevé
export const getHighContrastStyles = (enabled: boolean) => {
  if (!enabled) return {};
  
  return {
    backgroundColor: '#000000',
    color: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
  };
};

// Styles pour le texte agrandi
export const getLargeTextStyles = (enabled: boolean, baseSize: number = 16) => {
  const multiplier = enabled ? 1.3 : 1;
  return {
    fontSize: baseSize * multiplier,
    lineHeight: baseSize * multiplier * 1.4,
  };
};

// Annonces pour lecteur d'écran
export const announceForScreenReader = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

// Vérification si un lecteur d'écran est actif
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    return false;
  }
};

// Labels d'accessibilité pour les valeurs de glycémie
export const getGlucoseAccessibilityLabel = (
  value: number, 
  unit: string, 
  status: string,
  t: (key: string) => string
): string => {
  const statusText = status === 'low' ? t('add.status.low') : 
                    status === 'high' ? t('add.status.high') : 
                    t('add.status.normal');
  
  return `${t('add.value')}: ${value} ${unit}. ${statusText}`;
};

// Hints d'accessibilité
export const getAccessibilityHint = (action: string, t: (key: string) => string): string => {
  const hints: { [key: string]: string } = {
    save: 'Double-tap to save measurement',
    delete: 'Double-tap to delete measurement',
    edit: 'Double-tap to edit measurement',
    navigate: 'Double-tap to navigate',
  };
  
  return hints[action] || '';
};