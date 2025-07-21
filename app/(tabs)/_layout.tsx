import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Chrome as Home, Plus, ChartBar as BarChart3, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const { t } = useTranslation();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#CBD5E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#667EEA',
        tabBarInactiveTintColor: '#A0AEC0',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t('navigation.add'),
          tabBarIcon: ({ size, color }) => (
            <Plus size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}