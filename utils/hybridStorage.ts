// Deprecated: this module now delegates to SecureHybridStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlucoseMeasurement } from './storage';
import { SecureHybridStorage } from './secureCloudStorage';

const SYNC_STATUS_KEY = 'firebase_sync_enabled';
const LAST_SYNC_KEY = 'last_firebase_sync';

// Vérifier si la synchronisation Firebase est activée
export const isFirebaseSyncEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
};

// Activer/désactiver la synchronisation Firebase
export const setFirebaseSyncEnabled = async (enabled: boolean): Promise<void> => {
  return SecureHybridStorage.setSyncEnabled(enabled);
};

// Ajouter une mesure (local + Firebase si activé)
export const addMeasurementHybrid = async (
  measurement: Omit<GlucoseMeasurement, 'id'>,
  _userId?: string
): Promise<void> => {
  await SecureHybridStorage.addMeasurement(measurement);
};

// Récupérer les mesures (Firebase si activé, sinon local)
export const getMeasurementsHybrid = async (_userId?: string): Promise<GlucoseMeasurement[]> => {
  return SecureHybridStorage.getMeasurements();
};

// Supprimer une mesure (local + Firebase si activé)
export const removeMeasurementHybrid = async (
  id: string,
  _userId?: string
): Promise<void> => {
  await SecureHybridStorage.deleteMeasurement(id);
}

// Synchroniser les données locales vers Firebase
export const syncLocalToFirebase = async (_userId?: string): Promise<void> => {
  return SecureHybridStorage.syncWithCloud();
};

// Synchroniser Firebase vers local
export const syncFirebaseToLocal = async (_userId?: string): Promise<void> => {
  return SecureHybridStorage.syncWithCloud();
};

// Mettre à jour l'heure de dernière synchronisation
const updateLastSyncTime = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error('Erreur lors de la mise à jour du timestamp de sync:', error);
  }
};

// Obtenir l'heure de dernière synchronisation
export const getLastSyncTime = async (): Promise<Date | null> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  } catch (error) {
    return null;
  }
};