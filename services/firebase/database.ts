import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./config";
import { GlucoseMeasurement } from "../../types/glucose";

// Interface pour les mesures de glucose stockées dans Firestore
interface FirestoreGlucoseMeasurement {
  value: number;
  date: Timestamp;
  unit: string;
  notes?: string;
  mealContext?: string;
  syncedAt: Timestamp;
  updatedAt: Timestamp;
}

// Interface pour les préférences utilisateur stockées dans Firestore
interface FirestoreUserPreferences {
  unit: string;
  language: string;
  targetRangeMin: number;
  targetRangeMax: number;
  notificationsEnabled: boolean;
  theme: string;
  syncedAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Convertit un objet GlucoseMeasurement en format Firestore
 */
const toFirestoreMeasurement = (measurement: GlucoseMeasurement): FirestoreGlucoseMeasurement => {
  return {
    value: measurement.value,
    date: Timestamp.fromDate(new Date(measurement.timestamp)),
    unit: measurement.unit || "mgdl",
    notes: measurement.notes,
    mealContext: measurement.mealContext,
    syncedAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
};

/**
 * Convertit un document Firestore en objet GlucoseMeasurement
 */
const fromFirestoreMeasurement = (id: string, data: FirestoreGlucoseMeasurement): GlucoseMeasurement => {
  return {
    id,
    value: data.value,
    timestamp: data.date.toDate().getTime(),
    unit: data.unit,
    notes: data.notes || "",
    mealContext: data.mealContext || "",
  };
};

/**
 * Ajoute une mesure de glucose à Firestore
 */
export const addMeasurement = async (userId: string, measurement: GlucoseMeasurement): Promise<string> => {
  const measurementsRef = collection(db, `users/${userId}/measurements`);
  const firestoreMeasurement = toFirestoreMeasurement(measurement);
  const docRef = await addDoc(measurementsRef, firestoreMeasurement);
  return docRef.id;
};

/**
 * Met à jour une mesure de glucose dans Firestore
 */
export const updateMeasurement = async (userId: string, measurementId: string, measurement: GlucoseMeasurement): Promise<void> => {
  const measurementRef = doc(db, `users/${userId}/measurements/${measurementId}`);
  const firestoreMeasurement = toFirestoreMeasurement(measurement);
  await updateDoc(measurementRef, {
    ...firestoreMeasurement,
    updatedAt: serverTimestamp()
  });
};

/**
 * Supprime une mesure de glucose de Firestore
 */
export const deleteMeasurement = async (userId: string, measurementId: string): Promise<void> => {
  const measurementRef = doc(db, `users/${userId}/measurements/${measurementId}`);
  await deleteDoc(measurementRef);
};

/**
 * Récupère une mesure de glucose depuis Firestore
 */
export const getMeasurement = async (userId: string, measurementId: string): Promise<GlucoseMeasurement | null> => {
  const measurementRef = doc(db, `users/${userId}/measurements/${measurementId}`);
  const measurementSnap = await getDoc(measurementRef);
  
  if (measurementSnap.exists()) {
    return fromFirestoreMeasurement(measurementSnap.id, measurementSnap.data() as FirestoreGlucoseMeasurement);
  }
  
  return null;
};

/**
 * Récupère toutes les mesures de glucose d'un utilisateur
 */
export const getAllMeasurements = async (userId: string): Promise<GlucoseMeasurement[]> => {
  const measurementsRef = collection(db, `users/${userId}/measurements`);
  const q = query(measurementsRef, orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  
  const measurements: GlucoseMeasurement[] = [];
  querySnapshot.forEach((doc) => {
    measurements.push(fromFirestoreMeasurement(doc.id, doc.data() as FirestoreGlucoseMeasurement));
  });
  
  return measurements;
};

/**
 * Récupère les mesures de glucose d'un utilisateur pour une période donnée
 */
export const getMeasurementsByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<GlucoseMeasurement[]> => {
  const measurementsRef = collection(db, `users/${userId}/measurements`);
  const q = query(
    measurementsRef,
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  
  const measurements: GlucoseMeasurement[] = [];
  querySnapshot.forEach((doc) => {
    measurements.push(fromFirestoreMeasurement(doc.id, doc.data() as FirestoreGlucoseMeasurement));
  });
  
  return measurements;
};

/**
 * Écoute les changements dans les mesures de glucose d'un utilisateur
 */
export const subscribeMeasurements = (
  userId: string,
  onMeasurementsChange: (measurements: GlucoseMeasurement[]) => void
) => {
  const measurementsRef = collection(db, `users/${userId}/measurements`);
  const q = query(measurementsRef, orderBy("date", "desc"));
  
  return onSnapshot(q, (querySnapshot) => {
    const measurements: GlucoseMeasurement[] = [];
    querySnapshot.forEach((doc) => {
      measurements.push(fromFirestoreMeasurement(doc.id, doc.data() as FirestoreGlucoseMeasurement));
    });
    onMeasurementsChange(measurements);
  });
};

/**
 * Sauvegarde les préférences utilisateur dans Firestore
 */
export const saveUserPreferences = async (userId: string, preferences: any): Promise<void> => {
  const preferencesRef = doc(db, `users/${userId}/profile/preferences`);
  await setDoc(preferencesRef, {
    ...preferences,
    syncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Récupère les préférences utilisateur depuis Firestore
 */
export const getUserPreferences = async (userId: string): Promise<any> => {
  const preferencesRef = doc(db, `users/${userId}/profile/preferences`);
  const preferencesSnap = await getDoc(preferencesRef);
  
  if (preferencesSnap.exists()) {
    return preferencesSnap.data();
  }
  
  return null;
};

/**
 * Écoute les changements dans les préférences utilisateur
 */
export const subscribeUserPreferences = (
  userId: string,
  onPreferencesChange: (preferences: any) => void
) => {
  const preferencesRef = doc(db, `users/${userId}/profile/preferences`);
  
  return onSnapshot(preferencesRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      onPreferencesChange(docSnapshot.data());
    } else {
      onPreferencesChange(null);
    }
  });
};
