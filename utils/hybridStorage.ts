import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  addMeasurementToFirebase, 
  getMeasurementsFromFirebase, 
  removeMeasurementFromFirebase 
} from './firebaseStorage';
import { 
  addMeasurement as addMeasurementLocal, 
  getStoredMeasurements as getStoredMeasurementsLocal,
  removeMeasurement as removeMeasurementLocal,
  GlucoseMeasurement 
} from './storage';

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
  try {
    await AsyncStorage.setItem(SYNC_STATUS_KEY, enabled.toString());
    if (enabled) {
      await syncLocalToFirebase();
    }
  } catch (error) {
    console.error('Erreur lors de la configuration de la sync:', error);
  }
};

// Ajouter une mesure (local + Firebase si activé)
export const addMeasurementHybrid = async (
  measurement: Omit<GlucoseMeasurement, 'id'>,
  userId?: string
): Promise<void> => {
  try {
    // Toujours sauvegarder localement
    await addMeasurementLocal(measurement);

    // Sauvegarder sur Firebase si activé
    const syncEnabled = await isFirebaseSyncEnabled();
    if (syncEnabled) {
      await addMeasurementToFirebase(measurement, userId);
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout hybride:', error);
    throw error;
  }
};

// Récupérer les mesures (Firebase si activé, sinon local)
export const getMeasurementsHybrid = async (userId?: string): Promise<GlucoseMeasurement[]> => {
  try {
    const syncEnabled = await isFirebaseSyncEnabled();
    
    if (syncEnabled) {
      try {
        const firebaseMeasurements = await getMeasurementsFromFirebase(userId);
        // Mettre à jour le cache local
        await updateLastSyncTime();
        return firebaseMeasurements;
      } catch (error) {
        console.warn('Erreur Firebase, utilisation du cache local:', error);
        return await getStoredMeasurementsLocal();
      }
    } else {
      return await getStoredMeasurementsLocal();
    }
  } catch (error) {
    console.error('Erreur lors de la récupération hybride:', error);
    return [];
  }
};

// Supprimer une mesure (local + Firebase si activé)
export const removeMeasurementHybrid = async (
  id: string,
  userId?: string
): Promise<void> => {
  try {
    // Supprimer localement
    await removeMeasurementLocal(id);

    // Supprimer de Firebase si activé
    const syncEnabled = await isFirebaseSyncEnabled();
    if (syncEnabled) {
      await removeMeasurementFromFirebase(id);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression hybride:', error);
    throw error;
  }
};

// Synchroniser les données locales vers Firebase
export const syncLocalToFirebase = async (userId?: string): Promise<void> => {
  try {
    const localMeasurements = await getStoredMeasurementsLocal();
    const firebaseMeasurements = await getMeasurementsFromFirebase(userId);
    
    // Trouver les mesures qui n'existent que localement
    const localOnlyMeasurements = localMeasurements.filter(local => 
      !firebaseMeasurements.some(firebase => 
        firebase.timestamp === local.timestamp && 
        firebase.value === local.value
      )
    );

    // Uploader les mesures manquantes
    for (const measurement of localOnlyMeasurements) {
      await addMeasurementToFirebase({
        value: measurement.value,
        type: measurement.type,
        timestamp: measurement.timestamp,
        notes: measurement.notes
      }, userId);
    }

    await updateLastSyncTime();
    console.log(`${localOnlyMeasurements.length} mesures synchronisées vers Firebase`);
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
    throw error;
  }
};

// Synchroniser Firebase vers local
export const syncFirebaseToLocal = async (userId?: string): Promise<void> => {
  try {
    const firebaseMeasurements = await getMeasurementsFromFirebase(userId);
    
    // Effacer le cache local et le remplacer par les données Firebase
    await AsyncStorage.removeItem('glucose_measurements');
    
    for (const measurement of firebaseMeasurements) {
      await addMeasurementLocal({
        value: measurement.value,
        type: measurement.type,
        timestamp: measurement.timestamp,
        notes: measurement.notes
      });
    }

    await updateLastSyncTime();
    console.log(`${firebaseMeasurements.length} mesures synchronisées depuis Firebase`);
  } catch (error) {
    console.error('Erreur lors de la synchronisation depuis Firebase:', error);
    throw error;
  }
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