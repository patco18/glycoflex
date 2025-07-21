import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GlucoseMeasurement } from './storage';

const COLLECTION_NAME = 'glucose_measurements';

export interface FirebaseGlucoseMeasurement extends Omit<GlucoseMeasurement, 'timestamp'> {
  timestamp: Timestamp;
  userId?: string;
}

// Ajouter une mesure à Firebase
export const addMeasurementToFirebase = async (
  measurement: Omit<GlucoseMeasurement, 'id'>,
  userId?: string
): Promise<string> => {
  try {
    const measurementData: Omit<FirebaseGlucoseMeasurement, 'id'> = {
      ...measurement,
      timestamp: Timestamp.fromMillis(measurement.timestamp),
      userId: userId || 'glycoflex-user'
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), measurementData);
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de l\'ajout à Firebase:', error);
    throw error;
  }
};

// Récupérer toutes les mesures depuis Firebase
export const getMeasurementsFromFirebase = async (userId?: string): Promise<GlucoseMeasurement[]> => {
  try {
    const q = userId 
      ? query(
          collection(db, COLLECTION_NAME),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        )
      : query(
          collection(db, COLLECTION_NAME),
          where('userId', '==', 'glycoflex-user'),
          orderBy('timestamp', 'desc')
        );

    const querySnapshot = await getDocs(q);
    const measurements: GlucoseMeasurement[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirebaseGlucoseMeasurement;
      measurements.push({
        id: doc.id,
        value: data.value,
        type: data.type,
        timestamp: data.timestamp.toMillis(),
        notes: data.notes
      });
    });

    return measurements;
  } catch (error) {
    console.error('Erreur lors de la récupération depuis Firebase:', error);
    throw error;
  }
};

// Supprimer une mesure de Firebase
export const removeMeasurementFromFirebase = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Erreur lors de la suppression depuis Firebase:', error);
    throw error;
  }
};

// Écouter les changements en temps réel
export const subscribeToMeasurements = (
  callback: (measurements: GlucoseMeasurement[]) => void,
  userId?: string
) => {
  const q = userId 
    ? query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      )
    : query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', 'anonymous'),
        orderBy('timestamp', 'desc')
      );

  return onSnapshot(q, (querySnapshot) => {
    const measurements: GlucoseMeasurement[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirebaseGlucoseMeasurement;
      measurements.push({
        id: doc.id,
        value: data.value,
        type: data.type,
        timestamp: data.timestamp.toMillis(),
        notes: data.notes
      });
    });
    callback(measurements);
  });
};