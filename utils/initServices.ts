import 'react-native-get-random-values';
import 'react-native-url-polyfill';
import { auth } from '@/utils/internalAuth';

/**
 * Initialisation des services de l'application
 * Cette fonction initialise tous les services requis par l'application
 */
export const initializeServices = async () => {
  // Tester les polyfills pour crypto
  try {
    console.log('✅ react-native-get-random-values initialisé');
    console.log('✅ URL polyfills initialisés');

    const testArray = new Uint8Array(10);
    crypto.getRandomValues(testArray);
    console.log('✅ crypto.getRandomValues fonctionne correctement');
    console.log('🧪 Test crypto réussi:', Array.from(testArray).join(','));
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation des polyfills crypto:", error);
    throw error;
  }

  // Initialiser Sentry uniquement si DSN valide (et surtout: import dynamique)
  try {
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

    // DSN invalide => on n'importe même pas sentry-expo (évite le crash tslib/__extends)
    if (sentryDsn && sentryDsn.startsWith('http')) {
      const Sentry = await import('sentry-expo');

      Sentry.init({
        dsn: sentryDsn,
        enableInExpoDevelopment: true,
        debug: __DEV__,
        tracesSampleRate: 1.0,
      });

      console.log('✅ Sentry activé (DSN valide)');
    } else {
      console.log('🟡 Sentry désactivé (DSN vide/invalide)');
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Sentry:", error);
    // Ne pas bloquer l'application si Sentry échoue
  }

  return { auth };
};
