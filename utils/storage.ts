import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';

export interface GlucoseMeasurement {
  id: string;
  value: number;
  type: string;
  timestamp: number;
  notes?: string;
}

const STORAGE_KEY = 'glucose_measurements';

export const generateMeasurementId = (): string => nanoid();

export const getStoredMeasurements = async (): Promise<GlucoseMeasurement[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const measurements = JSON.parse(stored);
      // Sort by timestamp (newest first)
      return measurements.sort((a: GlucoseMeasurement, b: GlucoseMeasurement) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (error) {
    console.error('Erreur lors du chargement des mesures:', error);
    return [];
  }
};

export const addMeasurement = async (measurement: Omit<GlucoseMeasurement, 'id'>): Promise<GlucoseMeasurement> => {
  try {
    const measurements = await getStoredMeasurements();
    const newMeasurement: GlucoseMeasurement = {
      ...measurement,
      id: generateMeasurementId(),
    };

    measurements.unshift(newMeasurement);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));
    return newMeasurement;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la mesure:', error);
    throw error;
  }
};

export const removeMeasurement = async (id: string): Promise<void> => {
  try {
    const measurements = await getStoredMeasurements();
    const filtered = measurements.filter(m => m.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erreur lors de la suppression de la mesure:', error);
    throw error;
  }
};

export const clearAllMeasurements = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erreur lors de la suppression de toutes les mesures:', error);
    throw error;
  }
};