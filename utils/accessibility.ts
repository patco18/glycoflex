import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

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
    console.error('Erreur lors du chargement des paramètres d\'accessibilité:', error);
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
    console.error('Erreur lors de la sauvegarde des paramètres d\'accessibilité:', error);
  }
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

// Hook pour suivre le contraste élevé
export const useHighContrast = (): boolean => {
  const { accessibilitySettings } = useSettings();
  const [systemHighContrast, setSystemHighContrast] = useState(false);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;

    if ((AccessibilityInfo as any).isHighTextContrastEnabled) {
      AccessibilityInfo.isHighTextContrastEnabled()
        .then(setSystemHighContrast)
        .catch(() => setSystemHighContrast(false));

      subscription = AccessibilityInfo.addEventListener(
        'highTextContrastChanged',
        setSystemHighContrast
      );
    }

    return () => subscription?.remove();
  }, []);

  return accessibilitySettings.highContrast || systemHighContrast;
};

// Hook pour suivre le texte agrandi
export const useLargeText = (): boolean => {
  const { accessibilitySettings } = useSettings();
  const [systemBoldText, setSystemBoldText] = useState(false);

  useEffect(() => {
    const info: any = AccessibilityInfo;
    let subscription: { remove: () => void } | undefined;
    if (info.isBoldTextEnabled) {
      info.isBoldTextEnabled().then(setSystemBoldText);
      subscription = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        setSystemBoldText
      );
    }
    return () => subscription?.remove();
  }, []);

  return accessibilitySettings.largeText || systemBoldText;
};
