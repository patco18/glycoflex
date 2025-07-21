import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Détection de la langue du système sans react-native-localize
const getDeviceLanguage = () => {
  // Utiliser la langue du navigateur ou par défaut français
  if (typeof navigator !== 'undefined' && navigator.language) {
    const deviceLanguage = navigator.language.split('-')[0];
    return ['en', 'fr'].includes(deviceLanguage) ? deviceLanguage : 'fr';
  }
  return 'fr';
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
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;