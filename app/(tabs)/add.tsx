import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'expo-linear-gradient';
import { Calendar, Clock, Activity, Save, Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { addMeasurement } from '@/utils/storage';
import { getGlucoseStatus } from '@/utils/glucose';
import { sendGlucoseAlert } from '@/components/NotificationManager';
import { useSettings } from '@/contexts/SettingsContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const MEASUREMENT_TYPES = [
  { id: 'fasting', label: 'À jeun', icon: '🌅' },
  { id: 'before_meal', label: 'Avant repas', icon: '🍽️' },
  { id: 'after_meal', label: 'Après repas', icon: '🍽️' },
  { id: 'bedtime', label: 'Coucher', icon: '🌙' },
  { id: 'random', label: 'Aléatoire', icon: '📊' },
];

export default function AddScreen() {
  const { t } = useTranslation();
  const { userSettings } = useSettings();
  const [value, setValue] = useState('');
  const [selectedType, setSelectedType] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // États pour la date et l'heure
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentTime = customDate;
      selectedDate.setHours(currentTime.getHours());
      selectedDate.setMinutes(currentTime.getMinutes());
      setCustomDate(selectedDate);
      setUseCustomDate(true);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(customDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setCustomDate(newDate);
      setUseCustomDate(true);
    }
  };

  const showDatePickerModal = () => {
    setPickerMode('date');
    setShowDatePicker(true);
  };

  const showTimePickerModal = () => {
    setPickerMode('time');
    setShowTimePicker(true);
  };

  const resetDateTime = () => {
    setUseCustomDate(false);
    setCustomDate(new Date());
  };

  const formatCustomDate = (): string => {
    if (!useCustomDate) return t('add.currentDateTime');
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return customDate.toLocaleDateString(undefined, options);
  };

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
      // Convertir vers le format attendu par addMeasurement (utils/storage.ts)
      const storageFormat = {
        value: numericValue,
        type: selectedType,
        timestamp: useCustomDate ? customDate.getTime() : Date.now(),
        notes: notes.trim() || undefined
      };

      await addMeasurement(storageFormat);
      
      // Notification selon le statut
      const status = getGlucoseStatus(numericValue);
      let message = t('add.success.saved');
      
      if (status === 'low') {
        message += t('add.success.lowWarning');
        await sendGlucoseAlert(numericValue, 'low');
      } else if (status === 'high') {
        message += t('add.success.highWarning');
        await sendGlucoseAlert(numericValue, 'high');
      } else {
        message += t('add.success.normal');
      }

      Alert.alert(t('common.success'), message);
      
      // Reset form
      setValue('');
      setSelectedType('fasting');
      setNotes('');
      setUseCustomDate(false);
      setCustomDate(new Date());
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

            <View style={styles.dateTimeContainer}>
              <Text style={styles.label}>{t('add.dateTime')}</Text>
              
              <View style={styles.timeInfo}>
                <View style={styles.timeDisplay}>
                  <View style={styles.timeItem}>
                    <Calendar size={16} color="#6B7280" />
                    <Text style={[styles.timeText, useCustomDate && styles.customTimeText]}>
                      {formatCustomDate()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.dateButtonsContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={showDatePickerModal}
                  >
                    <Calendar size={18} color="#667EEA" />
                    <Text style={styles.dateButtonText}>{t('add.selectDate')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={showTimePickerModal}
                  >
                    <Clock size={18} color="#667EEA" />
                    <Text style={styles.dateButtonText}>{t('add.selectTime')}</Text>
                  </TouchableOpacity>
                  
                  {useCustomDate && (
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={resetDateTime}
                    >
                      <X size={18} color="#EF4444" />
                      <Text style={styles.resetButtonText}>{t('add.resetDateTime')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {showDatePicker && (
                <DateTimePicker
                  value={customDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
              
              {showTimePicker && (
                <DateTimePicker
                  value={customDate}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
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
  dateTimeContainer: {
    marginBottom: 24,
  },
  timeInfo: {
    flexDirection: 'column',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  customTimeText: {
    color: '#667EEA',
    fontWeight: '500',
  },
  dateButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#667EEA',
    marginLeft: 6,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 6,
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