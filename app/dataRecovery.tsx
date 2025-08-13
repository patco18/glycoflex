import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DataRecoveryTools from '@/components/DataRecoveryTools';

export default function DataRecoveryScreen() {
  const { t } = useTranslation();
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{
          title: t('settings.dataRecovery'),
          headerStyle: {
            backgroundColor: '#F3F4F6',
          },
          headerTintColor: '#1F2937',
          headerShadowVisible: false,
        }} 
      />
      
      <View style={styles.content}>
        <DataRecoveryTools />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
});
