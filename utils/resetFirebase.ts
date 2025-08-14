/**
 * Script de réinitialisation locale pour un projet Firebase propre
 * Ce script efface toutes les données locales liées à Firebase
 * et vous permet de repartir sur une base saine
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Réinitialise toutes les données locales liées à Firebase
 */
export async function resetLocalFirebaseData() {
  // Liste des clés à supprimer d'AsyncStorage
  const asyncStorageKeys = [
    'LAST_SYNC_TIMESTAMP',
    'SYNC_IN_PROGRESS',
    'secure_cloud_sync_enabled',
    'GLYCOFLEX_KEY_VERSION',
    'GLYCOFLEX_KEY_HASH',
    'GLYCOFLEX_LEGACY_KEYS',
    'GLYCOFLEX_MEASUREMENTS_CACHE',
    'GLYCOFLEX_SETTINGS_CACHE',
    'GLYCOFLEX_TEMP_SYNC_DATA',
    'firebase:authUser',
    'firebase:previousAuthUser'
  ];

  // Liste des clés à supprimer de SecureStore
  const secureStoreKeys = [
    'GLYCOFLEX_ENCRYPTION_KEY_V2',
    'auth_token'
  ];

  try {
    // Suppression des données d'AsyncStorage
    for (const key of asyncStorageKeys) {
      await AsyncStorage.removeItem(key);
      console.log(`✓ AsyncStorage: ${key} supprimé`);
    }

    // Suppression des données de SecureStore
    for (const key of secureStoreKeys) {
      await SecureStore.deleteItemAsync(key);
      console.log(`✓ SecureStore: ${key} supprimé`);
    }

    console.log('🎉 Réinitialisation locale terminée avec succès!');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    return false;
  }
}

/**
 * Fonction à appeler depuis l'interface utilisateur
 */
export function resetAppData() {
  Alert.alert(
    'Réinitialisation complète',
    'Cette opération va effacer toutes les données locales et vous déconnecter. Voulez-vous continuer?',
    [
      {
        text: 'Annuler',
        style: 'cancel'
      },
      {
        text: 'Réinitialiser',
        style: 'destructive',
        onPress: async () => {
          const success = await resetLocalFirebaseData();
          
          if (success) {
            Alert.alert(
              'Réinitialisation terminée',
              'Toutes les données ont été effacées. Veuillez redémarrer l\'application.',
              [
                { 
                  text: 'OK',
                  onPress: () => {
                    // Si possible, redémarrer l'application ou rediriger vers l'écran d'accueil
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              'Échec',
              'La réinitialisation a échoué. Veuillez réessayer.'
            );
          }
        }
      }
    ]
  );
}
