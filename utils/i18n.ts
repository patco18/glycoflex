import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization'; 

import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Détection de la langue du système avec expo-localization
const getDeviceLanguage = () => {
  try {
    // Utiliser expo-localization qui fonctionne sur toutes les plateformes
    const locales = Localization.getLocales();
    const locale = locales.length > 0 ? locales[0].languageTag : 'fr';
    const deviceLanguage = locale.split('-')[0].split('_')[0];
    return ['en', 'fr'].includes(deviceLanguage) ? deviceLanguage : 'fr';
  } catch (error) {
    console.error('Erreur de détection de langue:', error);
    return 'fr';
  }
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