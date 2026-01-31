import React from 'react';
import { render } from '@testing-library/react-native';
import AddScreen from '@/app/(tabs)/add';
import HistoryScreen from '@/app/(tabs)/history';
import HomeScreen from '@/app/(tabs)/index';
import SettingsScreen from '@/app/(tabs)/settings';
import SyncSettingsScreen from '@/app/(tabs)/syncSettings';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', changeLanguage: jest.fn() } })
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    userSettings: { unit: 'mgdl', targetMin: '70', targetMax: '140' },
    accessibilitySettings: { highContrast: false, largeText: false, screenReaderEnabled: false },
    updateUserSetting: jest.fn(),
    updateAccessibilitySetting: jest.fn(),
    isLoading: false
  })
}));

jest.mock('@/utils/storageManager', () => ({
  StorageManager: {
    getMeasurements: jest.fn().mockResolvedValue([]),
    addMeasurement: jest.fn()
  }
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: '1' } })
}));

jest.mock('@/utils/internalAuth', () => ({
  auth: { currentUser: { uid: '1' } }
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@react-native-community/netinfo', () => ({ fetch: jest.fn().mockResolvedValue({ isConnected: true }) }));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children
}));

jest.mock('@/components/AdvancedChart', () => () => null);
jest.mock('@/components/PredictiveAnalysis', () => () => null);
jest.mock('@/components/ComparisonAnalysis', () => () => null);
jest.mock('@/components/PDFExport', () => () => null);
jest.mock('@/components/StatsCards', () => () => null);

describe('Tab screens', () => {
  test('Add screen renders', () => {
    const { getByText } = render(<AddScreen />);
    expect(getByText(/add\.value/)).toBeTruthy();
  });

  test('History screen renders', async () => {
    const { findByText } = render(<HistoryScreen />);
    expect(await findByText('Historique')).toBeTruthy();
  });

  test('Home screen renders', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Chargement...')).toBeTruthy();
  });

  test('Settings screen renders', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('settings.title')).toBeTruthy();
  });

  test('SyncSettings screen renders', async () => {
    const { findByText } = render(<SyncSettingsScreen />);
    expect(await findByText('syncSettings.title')).toBeTruthy();
  });
});
