import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMeasurement, getStoredMeasurements, removeMeasurement, clearAllMeasurements, GlucoseMeasurement } from '@/utils/storage';

describe('storage utils', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('adds and retrieves measurements sorted by timestamp', async () => {
    const m1 = await addMeasurement({ value: 100, type: 'test', timestamp: 1 });
    const m2 = await addMeasurement({ value: 110, type: 'test', timestamp: 2 });
    const stored = await getStoredMeasurements();
    expect(stored[0].id).toBe(m2.id);
    expect(stored[1].id).toBe(m1.id);
  });

  test('removes a measurement', async () => {
    const m = await addMeasurement({ value: 100, type: 'test', timestamp: Date.now() });
    await removeMeasurement(m.id);
    const stored = await getStoredMeasurements();
    expect(stored).toHaveLength(0);
  });

  test('clears all measurements', async () => {
    await addMeasurement({ value: 100, type: 'test', timestamp: Date.now() });
    await clearAllMeasurements();
    const stored = await getStoredMeasurements();
    expect(stored).toHaveLength(0);
  });
});
