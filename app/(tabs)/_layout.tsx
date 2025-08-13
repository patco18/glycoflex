import { Stack } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { HomeIcon, PlusIcon, ClockIcon, SettingsIcon } from '../../components/Icons';
import { CloudIcon } from 'lucide-react-native';

export default function TabsLayout() {
  const { t } = useTranslation();
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs screenOptions={{
        tabBarActiveTintColor: '#667EEA',
        tabBarInactiveTintColor: '#A0AEC0',
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('navigation.home'),
            tabBarIcon: ({ color }) => <HomeIcon fill={color} />,
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: t('navigation.add'),
            tabBarIcon: ({ color }) => <PlusIcon fill={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('navigation.history'),
            tabBarIcon: ({ color }) => <ClockIcon fill={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('navigation.settings'),
            tabBarIcon: ({ color }) => <SettingsIcon fill={color} />,
          }}
        />
        <Tabs.Screen
          name="syncSettings"
          options={{
            title: t('navigation.sync'),
            tabBarIcon: ({ color }) => <CloudIcon size={24} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}