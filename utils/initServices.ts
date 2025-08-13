import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initLogService } from './logService';
import Constants from 'expo-constants';

// Polyfill pour crypto sur React Native
if (Platform.OS !== 'web') {
  require('react-native-get-random-values');
}

// Fonction pour initialiser tous les services requis de l'application de manière sécurisée
export async function initializeAppServices() {
  try {
    // Maintenir l'écran de démarrage visible pendant l'initialisation
    await SplashScreen.preventAutoHideAsync();
    
    // Initialiser Sentry pour la gestion des erreurs
    try {
      // Remplacer par votre DSN Sentry réel en production
      const sentryDsn = Constants.expoConfig?.extra?.sentryDsn || null;
      if (!sentryDsn) {
        console.log('⚠️ Aucun DSN Sentry trouvé, les erreurs ne seront pas envoyées à Sentry');
      } else {
        console.log('✅ Initialisation de Sentry avec un DSN valide');
      }
      initLogService(sentryDsn);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Sentry:', error);
    }
    
    // Ici, vous pouvez initialiser d'autres services nécessaires au démarrage
    // comme Firebase, les bases de données locales, etc.
    
    // Quand tout est prêt, cacher l'écran de démarrage
    await SplashScreen.hideAsync();
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des services:', error);
    
    // Log l'erreur dans Sentry
    import('./logService').then(logService => {
      logService.logError(error);
    }).catch(e => console.error('Failed to log error to Sentry:', e));
    
    // Même en cas d'erreur, on cache l'écran de démarrage pour éviter un blocage
    try {
      await SplashScreen.hideAsync();
    } catch (splashError) {
      console.error('Erreur lors de la fermeture de l\'écran de démarrage:', splashError);
    }
    
    return false;
  }
}
