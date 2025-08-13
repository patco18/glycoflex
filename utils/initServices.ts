import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Polyfill pour crypto sur React Native
if (Platform.OS !== 'web') {
  require('react-native-get-random-values');
}

// Fonction pour initialiser tous les services requis de l'application de manière sécurisée
export async function initializeAppServices() {
  try {
    // Maintenir l'écran de démarrage visible pendant l'initialisation
    await SplashScreen.preventAutoHideAsync();
    
    // Ici, vous pouvez initialiser d'autres services nécessaires au démarrage
    // comme Firebase, les bases de données locales, etc.
    
    // Quand tout est prêt, cacher l'écran de démarrage
    await SplashScreen.hideAsync();
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des services:', error);
    
    // Même en cas d'erreur, on cache l'écran de démarrage pour éviter un blocage
    try {
      await SplashScreen.hideAsync();
    } catch (splashError) {
      console.error('Erreur lors de la fermeture de l\'écran de démarrage:', splashError);
    }
    
    return false;
  }
}
