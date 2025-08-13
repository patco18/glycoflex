import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import GlucoseChart from '@/components/GlucoseChart';

jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({ userSettings: { targetMin: '70', targetMax: '140' } })
}));

jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LineChart: () => React.createElement(View, { testID: 'line-chart' }) };
});

describe('GlucoseChart', () => {
  test('shows empty state when no measurements', () => {
    const { getByText } = render(<GlucoseChart measurements={[]} period="week" />);
    expect(getByText('Ajoutez des mesures pour voir le graphique')).toBeTruthy();
  });

  test('renders chart when measurements exist', () => {
    const measurements = [{ id: '1', value: 100, type: 'test', timestamp: Date.now() }];
    const { getByTestId } = render(<GlucoseChart measurements={measurements} period="week" />);
    expect(getByTestId('line-chart')).toBeTruthy();
  });
});
