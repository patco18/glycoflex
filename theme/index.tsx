import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';

export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    card: 'rgba(255,255,255,0.95)',
    text: '#2D3748',
    muted: '#6B7280',
    placeholder: '#9CA3AF',
    primary: '#667EEA',
    secondary: '#00D9FF',
    warning: '#FF6B35',
    danger: '#FF3B82',
    accent: '#8B5CF6',
    subtitle: '#E0E7FF',
    info: '#2563EB',
    border: '#E2E8F0',
    white: '#FFFFFF',
    muted2: '#718096',
    overlayLight: 'rgba(255,255,255,0.2)',
    overlayStrong: 'rgba(255,255,255,0.9)',
  },
  gradients: {
    primary: ['#667EEA', '#764BA2', '#F093FB'],
    empty: ['#FF9A9E', '#FECFEF'],
  },
};

export const darkTheme = {
  colors: {
    background: '#1A202C',
    card: 'rgba(45,55,72,0.95)',
    text: '#F7FAFC',
    muted: '#A0AEC0',
    placeholder: '#718096',
    primary: '#667EEA',
    secondary: '#00D9FF',
    warning: '#FF6B35',
    danger: '#FF3B82',
    accent: '#8B5CF6',
    subtitle: '#CBD5E1',
    info: '#63B3ED',
    border: '#4A5568',
    white: '#FFFFFF',
    muted2: '#A0AEC0',
    overlayLight: 'rgba(255,255,255,0.1)',
    overlayStrong: 'rgba(255,255,255,0.2)',
  },
  gradients: {
    primary: ['#4C51BF', '#553C9A', '#9F7AEA'],
    empty: ['#FF9A9E', '#FECFEF'],
  },
};

export type Theme = typeof lightTheme;

const ThemeContext = createContext<Theme>(lightTheme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { userSettings } = useSettings();
  const systemScheme = useColorScheme();
  const scheme = userSettings.theme === 'system' ? systemScheme : userSettings.theme;
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return React.createElement(ThemeContext.Provider, { value: theme }, children);
};

export const useTheme = () => useContext(ThemeContext);

