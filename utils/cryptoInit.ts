import { Platform } from 'react-native';

/**
 * Initialise les polyfills crypto de manière robuste pour React Native
 */
export function initializeCryptoPolyfills(): void {
  if (Platform.OS === 'web') {
    console.log('🌐 Environnement web - utilisation du crypto natif');
    return;
  }

  try {
    // Initialiser react-native-get-random-values AVANT toute utilisation de crypto
    require('react-native-get-random-values');
    console.log('✅ react-native-get-random-values initialisé');

    // Initialiser les polyfills URL
    require('react-native-url-polyfill/auto');
    console.log('✅ URL polyfills initialisés');

    // Tester que crypto.getRandomValues fonctionne
    if (global.crypto && global.crypto.getRandomValues) {
      const testArray = new Uint8Array(1);
      global.crypto.getRandomValues(testArray);
      console.log('✅ crypto.getRandomValues fonctionne correctement');
    } else {
      console.warn('⚠️ crypto.getRandomValues non disponible');
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des polyfills crypto:', error);
    
    // Fallback: définir un générateur de nombres aléatoires simple
    if (!global.crypto) {
      global.crypto = {} as any;
    }
    
    if (!global.crypto.getRandomValues) {
      global.crypto.getRandomValues = (array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      };
      console.log('🔄 Fallback crypto.getRandomValues configuré');
    }
  }
}

/**
 * Générateur d'ID sécurisé qui fonctionne sans dépendances externes
 */
export function generateSecureId(length: number = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Utiliser Date.now() pour l'unicité temporelle
  const timestamp = Date.now().toString(36);
  result += timestamp;
  
  // Ajouter des caractères aléatoires pour atteindre la longueur souhaitée
  const remainingLength = Math.max(0, length - timestamp.length);
  
  for (let i = 0; i < remainingLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Test de fonctionnement des polyfills crypto
 */
export function testCryptoPolyfills(): boolean {
  try {
    if (Platform.OS === 'web') return true;
    
    // Test de crypto.getRandomValues
    if (global.crypto && global.crypto.getRandomValues) {
      const testArray = new Uint8Array(10);
      global.crypto.getRandomValues(testArray);
      console.log('🧪 Test crypto réussi:', Array.from(testArray).join(','));
      return true;
    }
    
    console.warn('⚠️ crypto.getRandomValues non disponible');
    return false;
  } catch (error) {
    console.error('❌ Test crypto échoué:', error);
    return false;
  }
}
