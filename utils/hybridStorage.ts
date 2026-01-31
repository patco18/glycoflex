// Deprecated: this module now delegates to the PostgreSQL hybrid storage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlucoseMeasurement } from './storage';
import { getCloudStorageProvider } from './cloudStorageProvider';

const SYNC_STATUS_KEY = 'secure_cloud_sync_enabled';
const LAST_SYNC_KEY = 'last_secure_cloud_sync';

const getHybridStorage = () => getCloudStorageProvider().hybrid;

// Vérifier si la synchronisation cloud est activée
export const isCloudSyncEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
};

// Activer/désactiver la synchronisation cloud
export const setCloudSyncEnabled = async (enabled: boolean): Promise<void> => {
  return getHybridStorage().setSyncEnabled(enabled);
};

// Ajouter une mesure (local + cloud si activé)
export const addMeasurementHybrid = async (
  measurement: Omit<GlucoseMeasurement, 'id'>,
  _userId?: string
): Promise<void> => {
  await getHybridStorage().addMeasurement(measurement);
};

// Récupérer les mesures (cloud si activé, sinon local)
export const getMeasurementsHybrid = async (_userId?: string): Promise<GlucoseMeasurement[]> => {
  return getHybridStorage().getMeasurements();
};

// Supprimer une mesure (local + cloud si activé)
export const removeMeasurementHybrid = async (
  id: string,
  _userId?: string
): Promise<void> => {
  await getHybridStorage().deleteMeasurement(id);
};

// Synchroniser les données locales vers le cloud
export const syncLocalToCloud = async (_userId?: string): Promise<void> => {
  return getHybridStorage().syncWithCloud();
};

// Synchroniser le cloud vers local
export const syncCloudToLocal = async (_userId?: string): Promise<void> => {
  return getHybridStorage().syncWithCloud();
};

// Obtenir l'heure de dernière synchronisation
export const getLastSyncTime = async (): Promise<Date | null> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? new Date(parseInt(timestamp, 10)) : null;
  } catch (error) {
    return null;
  }
};
