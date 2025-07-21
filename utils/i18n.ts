import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Détection de la langue du système
const getDeviceLanguage = () => {
  // Fallback pour éviter l'erreur RNLocalize dans Expo Go
  try {
    if (Platform.OS !== 'web') {
      const Localization = require('react-native-localize');
      const locales = Localization.getLocales();
      if (locales.length > 0) {
        const deviceLanguage = locales[0].languageCode;
        return ['en', 'fr'].includes(deviceLanguage) ? deviceLanguage : 'en';
      }
    }
  } catch (error) {
    console.warn('react-native-localize not available, using default language');
  }
  return 'en';
};

// Fonction pour changer la langue
export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
};

// Configuration i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;