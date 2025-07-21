import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Activity, Save } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { addMeasurementHybrid } from '@/utils/hybridStorage';
import { GlucoseMeasurement } from '@/utils/storage';
import { getGlucoseStatus } from '@/utils/glucose';
import { useSettings } from '@/contexts/SettingsContext';

const MEASUREMENT_TYPES = [
  { id: 'fasting', label: 'À jeun', icon: '🌅' },
  { id: 'before_meal', label: 'Avant repas', icon: '🍽️' },
  { id: 'after_meal', label: 'Après repas', icon: '🍽️' },
  { id: 'bedtime', label: 'Coucher', icon: '🌙' },
  { id: 'random', label: 'Aléatoire', icon: '📊' },
];

function AddScreen() {
  const { t } = useTranslation();
  const { userSettings } = useSettings();
  const [value, setValue] = useState('');
  const [selectedType, setSelectedType] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value || isNaN(Number(value))) {
      Alert.alert(t('common.error'), t('add.errors.invalidValue'));
      return;
    }

    const numericValue = Number(value);
    
    // Validation selon l'unité
    const minValue = userSettings.unit === 'mgdl' ? 20 : 1.1;
    const maxValue = userSettings.unit === 'mgdl' ? 600 : 33.3;
    const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';
    
    if (numericValue < minValue || numericValue > maxValue) {
      Alert.alert(t('common.error'), t('add.errors.outOfRange', { min: minValue, max: maxValue, unit: unitLabel }));
      return;
    }

    setSaving(true);
    try {
      const measurement: Omit<GlucoseMeasurement, 'id'> = {
        value: numericValue,
        type: MEASUREMENT_TYPES.find(t => t.id === selectedType)?.label || 'À jeun',
        timestamp: Date.now(),
        notes: notes.trim() || undefined,
      };

      await addMeasurementHybrid(measurement);
      
      // Notification selon le statut
      const status = getGlucoseStatus(numericValue);
      let message = t('add.success.saved');
      
      if (status === 'low') {
        message += t('add.success.lowWarning');
      } else if (status === 'high') {
        message += t('add.success.highWarning');
      } else {
        message += t('add.success.normal');
      }

      Alert.alert(t('common.success'), message);
      
      // Reset form
      setValue('');
      setSelectedType('fasting');
      setNotes('');
    } catch (error) {
      Alert.alert(t('common.error'), t('add.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (val: string) => {
    const numVal = Number(val);
    if (isNaN(numVal)) return '#6B7280';
    
    const status = getGlucoseStatus(numVal);
    switch (status) {
      case 'low': return '#FF3B82';
      case 'high': return '#FF6B35';
      case 'normal': return '#00D9FF';
      default: return '#8B5CF6';
    }
  };

  const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2', '#F093FB']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('add.title')}</Text>
            <Text style={styles.subtitle}>{t('add.subtitle')}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('add.value')} ({t('add.unit', { unit: unitLabel })})</Text>
              <View style={styles.valueInputContainer}>
                <TextInput
                  style={[styles.valueInput, { color: getStatusColor(value) }]}
                  value={value}
                  onChangeText={setValue}
                  placeholder="120"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.unit}>{unitLabel}</Text>
              </View>
              {value && !isNaN(Number(value)) && (
                <Text style={[styles.statusText, { color: getStatusColor(value) }]}>
                  {getGlucoseStatus(Number(value)) === 'low' && t('add.status.low')}
                  {getGlucoseStatus(Number(value)) === 'high' && t('add.status.high')}
                  {getGlucoseStatus(Number(value)) === 'normal' && t('add.status.normal')}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('add.measurementType')}</Text>
              <View style={styles.typeContainer}>
                {MEASUREMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      selectedType === type.id && styles.typeButtonSelected,
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <Text style={styles.typeEmoji}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.typeLabel,
                        selectedType === type.id && styles.typeLabelSelected,
                      ]}
                    >
                      {t(`add.types.${type.id}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('add.notes')}</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('add.notesPlaceholder')}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.timeInfo}>
              <View style={styles.timeItem}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.timeText}>
                  {new Date().toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View style={styles.timeItem}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.timeText}>
                  {new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
               {saving ? t('add.saving') : t('add.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667EEA',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
  },
  valueInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  unit: {
    fontSize: 16,
    color: '#718096',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  typeButtonSelected: {
    backgroundColor: '#667EEA',
  },
  typeEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: '#718096',
  },
  typeLabelSelected: {
    color: '#FFFFFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
    textAlignVertical: 'top',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#718096',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#667EEA',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddScreen;