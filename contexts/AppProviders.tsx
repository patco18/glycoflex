import React from 'react';
import { Text, View } from 'react-native';
import { SyncProvider } from './SyncContext';
import { SettingsProvider } from './SettingsContext';

// Ce Provider permet d'encapsuler tous les contextes nécessaires à l'application
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SettingsProvider>
      <SyncProvider>
        {children}
      </SyncProvider>
    </SettingsProvider>
  );
};
