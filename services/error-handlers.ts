/**
 * Utilitaire pour gérer les erreurs Firebase et Metro
 * Ce fichier aide à diagnostiquer et résoudre les erreurs courantes dans le bundler
 */

import { Platform } from 'react-native';

/**
 * Enregistre un gestionnaire d'erreurs global pour attraper les erreurs non gérées
 * et afficher des messages d'erreur plus utiles pour le développement
 */
export function setupErrorHandlers() {
  // Gestionnaire d'erreurs global pour React Native
  // @ts-ignore - ErrorUtils existe dans React Native mais n'est pas typé
  if (global.ErrorUtils && !global.ErrorUtils._globalHandler) {
    // @ts-ignore - ErrorUtils existe dans React Native mais n'est pas typé
    const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
    
    // @ts-ignore - ErrorUtils existe dans React Native mais n'est pas typé
    global.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      // Traitement personnalisé pour les erreurs Metro
      if (error?.message?.includes('ENOENT') && error?.message?.includes('<anonymous>')) {
        console.log('=== METRO BUNDLER ERROR DETECTED ===');
        console.log('This is likely an issue with the Metro bundler cache or symlinks.');
        console.log('Try one of the following solutions:');
        console.log('1. Clear Metro cache: npx react-native start --reset-cache');
        console.log('2. Check for circular dependencies in your imports');
        console.log('3. Check for invalid/duplicate imports or exports');
        console.log('=== END OF METRO ERROR HELP ===');
      }
      
      // Traitement personnalisé pour les erreurs Firebase
      if (error?.message?.includes('firebase') || 
          error?.stack?.includes('firebase') || 
          // @ts-ignore - Les erreurs Firebase ont une propriété code non standard
          (error?.code && typeof error.code === 'string' && error.code.startsWith('auth/'))) {
        console.log('=== FIREBASE ERROR DETECTED ===');
        console.log('This could be related to authentication, Firestore, or initialization issues.');
        console.log('Consider running the Firebase diagnostic tools in services/firebase/advanced-diagnostic.ts');
        console.log('=== END OF FIREBASE ERROR HELP ===');
      }
      
      // Passer l'erreur au gestionnaire d'origine
      originalGlobalHandler(error, isFatal);
    });
  }

  // Sur le web, nous ajoutons également un gestionnaire window.onerror
  if (Platform.OS === 'web') {
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (typeof message === 'string' && message.includes('<anonymous>')) {
        console.log('=== WEB BUNDLER ERROR DETECTED ===');
        console.log('This is likely an issue with the Metro/Webpack bundler cache.');
        console.log('Try clearing your cache and restarting the bundler.');
        console.log('=== END OF WEB ERROR HELP ===');
      }
      
      // Appeler le gestionnaire d'erreur d'origine s'il existe
      if (typeof originalOnError === 'function') {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
  }
}

/**
 * Nettoie le cache Metro et aide à résoudre les problèmes de bundling
 */
export function fixMetroCacheIssues() {
  console.log('To fix Metro cache issues:');
  console.log('1. Stop the current bundler process');
  console.log('2. Run: npx react-native start --reset-cache');
  console.log('3. In a new terminal, run: npx react-native run-android (or run-ios)');
  
  // Sur le web, nous pouvons essayer de recharger la page
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    console.log('Attempting to reload the page to clear cache...');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
}
