import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { userSettings, updateUserSetting } = useSettings();
  const [name, setName] = useState(userSettings.name);
  const [age, setAge] = useState(userSettings.age);
  const [persistedName, setPersistedName] = useState<string | null>(null);
  const [persistedAge, setPersistedAge] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState('');

  useEffect(() => {
    setName(userSettings.name);
    setAge(userSettings.age);
  }, [userSettings.name, userSettings.age]);

  const ageError = useMemo(() => {
    if (!age.trim()) return '';
    const normalized = age.trim();
    if (!/^[0-9]+$/.test(normalized)) {
      return 'Veuillez saisir un âge numérique.';
    }
    if (parseInt(normalized, 10) <= 0) {
      return 'Veuillez saisir un âge supérieur à 0.';
    }
    return '';
  }, [age]);

  const refreshPersistence = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (!storedSettings) {
        setPersistedName(null);
        setPersistedAge(null);
        setPersistenceMessage('Aucune donnée persistée trouvée.');
        return;
      }
      const parsed = JSON.parse(storedSettings);
      setPersistedName(parsed?.name ?? '');
      setPersistedAge(parsed?.age ?? '');
      setPersistenceMessage('Données chargées depuis AsyncStorage.');
    } catch (error) {
      console.error('Erreur lors de la lecture AsyncStorage:', error);
      setPersistenceMessage('Erreur lors de la lecture AsyncStorage.');
    }
  };

  useEffect(() => {
    refreshPersistence();
  }, []);

  const handleSave = async () => {
    await updateUserSetting('name', name.trim());
    await updateUserSetting('age', age.trim());
    await refreshPersistence();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.headerGradient}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Modifier votre nom et votre âge</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Âge</Text>
          <TextInput
            style={[styles.input, ageError ? styles.inputError : null]}
            value={age}
            onChangeText={setAge}
            placeholder="Votre âge"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, ageError ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={Boolean(ageError)}
          >
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Test de persistance AsyncStorage</Text>
          <Text style={styles.persistenceText}>{persistenceMessage}</Text>
          <Text style={styles.persistenceDetail}>Nom sauvegardé : {persistedName ?? '—'}</Text>
          <Text style={styles.persistenceDetail}>Âge sauvegardé : {persistedAge ?? '—'}</Text>
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
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#667EEA',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
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
