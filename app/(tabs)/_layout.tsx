import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Dimensions } from 'react-native';
import { Home, Plus, BarChart3, Settings } from 'lucide-react-native';
import { getAndroidMaterialTheme } from '@/utils/androidOptimizations';

// Utilisation du module Tabs correctement
const { Tabs } = require('expo-router/tabs');

export default function TabLayout() {
  const { t } = useTranslation();
  const { width } = Dimensions.get('window');
  const materialTheme = getAndroidMaterialTheme();

  // Adaptation pour tablettes Android
  const isTablet = width > 768;
  const tabBarHeight = Platform.OS === 'android' ? (isTablet ? 70 : 60) : 60;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'android' ? materialTheme.surface : '#ffffff',
          borderTopWidth: Platform.OS === 'android' ? 0 : 1,
          borderTopColor: '#CBD5E0',
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'android' ? 12 : 8,
          paddingTop: Platform.OS === 'android' ? 12 : 8,
          elevation: Platform.OS === 'android' ? 8 : 0,
          shadowColor: Platform.OS === 'android' ? 'transparent' : '#000',
          // Style Material Design pour Android
          ...(Platform.OS === 'android' && {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            marginHorizontal: 0,
          })
        },
        tabBarActiveTintColor: materialTheme.primary,
        tabBarInactiveTintColor: Platform.OS === 'android' ? materialTheme.onSurface + '80' : '#A0AEC0',
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'android' ? (isTablet ? 14 : 12) : 12,
          fontWeight: Platform.OS === 'android' ? '500' : 'normal',
          marginTop: Platform.OS === 'android' ? 4 : 0,
        },
        tabBarIconStyle: {
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
        // Animation pour Android
        ...(Platform.OS === 'android' && {
          tabBarHideOnKeyboard: true,
          tabBarVisibilityAnimationConfig: {
            show: {
              animation: 'timing',
              config: {
                duration: 200,
              },
            },
            hide: {
              animation: 'timing',
              config: {
                duration: 150,
              },
            },
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ size, color }) => (
            <Home
              size={Platform.OS === 'android' ? (isTablet ? size + 2 : size) : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t('navigation.add'),
          tabBarIcon: ({ size, color }) => (
            <Plus
              size={Platform.OS === 'android' ? (isTablet ? size + 2 : size) : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ size, color }) => (
            <BarChart3
              size={Platform.OS === 'android' ? (isTablet ? size + 2 : size) : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ size, color }) => (
            <Settings
              size={Platform.OS === 'android' ? (isTablet ? size + 2 : size) : size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}