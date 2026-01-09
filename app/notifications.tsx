import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const { userSettings, updateUserSetting } = useSettings();
  const [notificationsEnabled, setNotificationsEnabled] = useState(userSettings.notifications);
  const [persistedNotifications, setPersistedNotifications] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState('');

  useEffect(() => {
    setNotificationsEnabled(userSettings.notifications);
  }, [userSettings.notifications]);

  const refreshPersistence = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (!storedSettings) {
        setPersistedNotifications(null);
        setPersistenceMessage('Aucune donnée persistée trouvée.');
        return;
      }
      const parsed = JSON.parse(storedSettings);
      setPersistedNotifications(parsed?.notifications ? 'Activées' : 'Désactivées');
      setPersistenceMessage('Données chargées depuis AsyncStorage.');
    } catch (error) {
      console.error('Erreur lors de la lecture AsyncStorage:', error);
      setPersistenceMessage('Erreur lors de la lecture AsyncStorage.');
    }
  };

  useEffect(() => {
    refreshPersistence();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await updateUserSetting('notifications', value);
    await refreshPersistence();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.headerGradient}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Gérer les alertes et rappels</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textGroup}>
              <Text style={styles.label}>Activer les notifications</Text>
              <Text style={styles.helperText}>
                Recevez des rappels pour vos saisies et vos objectifs.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#D1D5DB', true: '#667EEA' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Test de persistance AsyncStorage</Text>
          <Text style={styles.persistenceText}>{persistenceMessage}</Text>
          <Text style={styles.persistenceDetail}>Notifications sauvegardées : {persistedNotifications ?? '—'}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={refreshPersistence}>
            <Text style={styles.secondaryButtonText}>Vérifier la persistance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  persistenceText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  persistenceDetail: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});
