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

export default function TargetsScreen() {
  const router = useRouter();
  const { userSettings, updateUserSetting } = useSettings();
  const [targetMin, setTargetMin] = useState(userSettings.targetMin);
  const [targetMax, setTargetMax] = useState(userSettings.targetMax);
  const [persistedMin, setPersistedMin] = useState<string | null>(null);
  const [persistedMax, setPersistedMax] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState('');

  const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';

  useEffect(() => {
    setTargetMin(userSettings.targetMin);
    setTargetMax(userSettings.targetMax);
  }, [userSettings.targetMin, userSettings.targetMax]);

  const normalizedMin = targetMin.replace(',', '.');
  const normalizedMax = targetMax.replace(',', '.');

  const validationError = useMemo(() => {
    const minValue = parseFloat(normalizedMin);
    const maxValue = parseFloat(normalizedMax);

    if (!targetMin.trim() || !targetMax.trim()) {
      return 'Les deux cibles sont requises.';
    }
    if (Number.isNaN(minValue) || Number.isNaN(maxValue)) {
      return 'Les cibles doivent être numériques.';
    }
    if (minValue <= 0 || maxValue <= 0) {
      return 'Les cibles doivent être supérieures à 0.';
    }
    if (minValue >= maxValue) {
      return 'La cible minimale doit être inférieure à la cible maximale.';
    }
    return '';
  }, [normalizedMin, normalizedMax, targetMin, targetMax]);

  const refreshPersistence = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (!storedSettings) {
        setPersistedMin(null);
        setPersistedMax(null);
        setPersistenceMessage('Aucune donnée persistée trouvée.');
        return;
      }
      const parsed = JSON.parse(storedSettings);
      setPersistedMin(parsed?.targetMin ?? '');
      setPersistedMax(parsed?.targetMax ?? '');
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
    await updateUserSetting('targetMin', normalizedMin);
    await updateUserSetting('targetMax', normalizedMax);
    await refreshPersistence();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.headerGradient}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cibles glycémiques</Text>
        <Text style={styles.headerSubtitle}>Définissez votre plage cible ({unitLabel})</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Cible minimale ({unitLabel})</Text>
          <TextInput
            style={[styles.input, validationError ? styles.inputError : null]}
            value={targetMin}
            onChangeText={setTargetMin}
            keyboardType="numeric"
            placeholder="Ex: 70"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Cible maximale ({unitLabel})</Text>
          <TextInput
            style={[styles.input, validationError ? styles.inputError : null]}
            value={targetMax}
            onChangeText={setTargetMax}
            keyboardType="numeric"
            placeholder="Ex: 140"
            placeholderTextColor="#9CA3AF"
          />

          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, validationError ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={Boolean(validationError)}
          >
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Test de persistance AsyncStorage</Text>
          <Text style={styles.persistenceText}>{persistenceMessage}</Text>
          <Text style={styles.persistenceDetail}>Cible min sauvegardée : {persistedMin ?? '—'} {unitLabel}</Text>
          <Text style={styles.persistenceDetail}>Cible max sauvegardée : {persistedMax ?? '—'} {unitLabel}</Text>
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
