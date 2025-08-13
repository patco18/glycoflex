import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage } from '@/utils/i18n';

export type GlucoseUnit = 'mgdl' | 'mmoll';
export type Language = 'fr' | 'en';

export interface UserSettings {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  medicalId: string;
  doctorName: string;
  medicalConditions: string[];
  medications: string[];
  targetMin: string;
  targetMax: string;
  notifications: boolean;
  language: Language;
  unit: GlucoseUnit;
  timezone: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReaderEnabled: boolean;
  reduceMotion: boolean;
}

interface SettingsContextType {
  userSettings: UserSettings;
  accessibilitySettings: AccessibilitySettings;
  updateUserSetting: (key: keyof UserSettings, value: string | boolean) => Promise<void>;
  updateAccessibilitySetting: (key: keyof AccessibilitySettings, value: boolean) => Promise<void>;
  isLoading: boolean;
}

const defaultUserSettings: UserSettings = {
  name: '',
  age: '',
  gender: '',
  weight: '',
  height: '',
  medicalId: '',
  doctorName: '',
  medicalConditions: [],
  medications: [],
  targetMin: '70',
  targetMax: '140',
  notifications: true,
  language: 'fr',
  unit: 'mgdl',
  timezone: 'Europe/Paris',
};

const defaultAccessibilitySettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  screenReaderEnabled: false,
  reduceMotion: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(defaultAccessibilitySettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [storedUserSettings, storedAccessibilitySettings] = await Promise.all([
        AsyncStorage.getItem('userSettings'),
        AsyncStorage.getItem('accessibilitySettings')
      ]);

      if (storedUserSettings) {
        const parsed = JSON.parse(storedUserSettings);
        const newSettings = { ...defaultUserSettings, ...parsed };
        setUserSettings(newSettings);
        
        // Appliquer la langue sauvegardée
        if (parsed.language) {
          changeLanguage(parsed.language);
        }
      }

      if (storedAccessibilitySettings) {
        const parsed = JSON.parse(storedAccessibilitySettings);
        setAccessibilitySettings({ ...defaultAccessibilitySettings, ...parsed });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserSetting = async (key: keyof UserSettings, value: string | boolean) => {
    try {
      let newSettings = { ...userSettings };

      // Si l'unité change, convertir les valeurs min et max
      if (key === 'unit' && value !== userSettings.unit) {
        const fromUnit = userSettings.unit;
        const toUnit = value as GlucoseUnit;
        
        // Importer la fonction de conversion dynamiquement pour éviter les dépendances circulaires
        const { convertGlucose } = await import('@/utils/units');
        
        // Convertir les valeurs cibles
        const targetMin = parseFloat(userSettings.targetMin);
        const targetMax = parseFloat(userSettings.targetMax);
        
        if (!isNaN(targetMin)) {
          const convertedMin = convertGlucose(targetMin, fromUnit as GlucoseUnit, toUnit);
          newSettings.targetMin = toUnit === 'mmoll' ? convertedMin.toFixed(1) : Math.round(convertedMin).toString();
        }
        
        if (!isNaN(targetMax)) {
          const convertedMax = convertGlucose(targetMax, fromUnit as GlucoseUnit, toUnit);
          newSettings.targetMax = toUnit === 'mmoll' ? convertedMax.toFixed(1) : Math.round(convertedMax).toString();
        }
      }

      // Mettre à jour la valeur demandée
      newSettings = { ...newSettings, [key]: value };
      setUserSettings(newSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      
      // Changer la langue immédiatement si c'est le paramètre de langue
      if (key === 'language') {
        changeLanguage(value as string);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres utilisateur:', error);
    }
  };

  const updateAccessibilitySetting = async (key: keyof AccessibilitySettings, value: boolean) => {
    try {
      const newSettings = { ...accessibilitySettings, [key]: value };
      setAccessibilitySettings(newSettings);
      await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres d\'accessibilité:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        userSettings,
        accessibilitySettings,
        updateUserSetting,
        updateAccessibilitySetting,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};