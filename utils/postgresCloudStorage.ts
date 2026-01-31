import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/utils/internalAuth';
import { GlucoseMeasurement, generateMeasurementId } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_SYNC_API_URL;
const SYNC_ENABLED_KEY = 'secure_cloud_sync_enabled';
const LAST_SYNC_KEY = 'last_secure_cloud_sync';
const LOCAL_STORAGE_KEY = 'glucose_measurements';

const ensureApiUrl = () => {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_SYNC_API_URL for PostgreSQL sync provider');
  }
};

const getAuthHeader = async () => {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non connecté');
  }
  return auth.getAuthHeader();
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  ensureApiUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...authHeader,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`PostgreSQL sync error (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export class PostgresCloudStorage {
  static async getMeasurements(): Promise<GlucoseMeasurement[]> {
    return request<GlucoseMeasurement[]>('/v1/measurements');
  }

  static async addMeasurement(measurement: GlucoseMeasurement): Promise<GlucoseMeasurement> {
    return request<GlucoseMeasurement>('/v1/measurements', {
      method: 'POST',
      body: JSON.stringify(measurement),
    });
  }

  static async deleteMeasurement(id: string): Promise<void> {
    await request<void>(`/v1/measurements/${id}`, { method: 'DELETE' });
  }

  static async checkForConflicts(): Promise<{ hasConflicts: boolean }> {
    return { hasConflicts: false };
  }

  static async getConnectedDevices(): Promise<Array<{ id: string; name: string; lastActive: number; isCurrent: boolean }>> {
    return [];
  }

  static async removeDevice(_deviceId: string): Promise<void> {
    return undefined;
  }

  static getCorruptedDocIds(): string[] {
    return [];
  }

  static async getIgnoredCorruptedDocIds(): Promise<string[]> {
    return [];
  }

  static async forceMigrationScan(): Promise<{ totalCloud: number; corrupted: number; ignored: number }> {
    return { totalCloud: 0, corrupted: 0, ignored: 0 };
  }
}

export class PostgresHybridStorage {
  static async initialize(): Promise<void> {
    return undefined;
  }

  static async isSyncEnabled(): Promise<boolean> {
    const stored = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
    return stored === 'true';
  }

  static async setSyncEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(SYNC_ENABLED_KEY, enabled.toString());
  }

  static async getLastSyncTime(): Promise<number | null> {
    const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  static async getPendingOperationsCount(): Promise<number> {
    return 0;
  }

  static async addMeasurement(measurement: Omit<GlucoseMeasurement, 'id'>): Promise<GlucoseMeasurement> {
    const measurementWithId: GlucoseMeasurement = {
      ...measurement,
      id: generateMeasurementId(),
    };
    const saved = await PostgresCloudStorage.addMeasurement(measurementWithId);
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    return saved;
  }

  static async getMeasurements(): Promise<GlucoseMeasurement[]> {
    return PostgresCloudStorage.getMeasurements();
  }

  static async deleteMeasurement(id: string): Promise<void> {
    await PostgresCloudStorage.deleteMeasurement(id);
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }

  static async syncWithCloud(): Promise<GlucoseMeasurement[]> {
    const measurements = await PostgresCloudStorage.getMeasurements();
    await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(measurements));
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    return measurements;
  }

  static async backupEncryptionKeyWithPhrase(): Promise<void> {
    throw new Error('Sauvegarde de clé non disponible avec PostgreSQL');
  }

  static async restoreEncryptionKeyWithPhrase(): Promise<void> {
    throw new Error('Restauration de clé non disponible avec PostgreSQL');
  }
}
