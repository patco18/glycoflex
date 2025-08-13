import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Activity, Save, Edit } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { StorageManager } from '@/utils/storageManager';
import { GlucoseMeasurement } from '@/utils/storage';
import { getGlucoseStatus } from '@/utils/glucose';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/useToast';

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
  const toast = useToast();
  
  // États pour la date et l'heure
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Fonction pour ouvrir le sélecteur de date
  const showDatePickerModal = () => {
    setPickerMode('date');
    setShowDatePicker(true);
  };

  // Fonction pour ouvrir le sélecteur d'heure
  const showTimePickerModal = () => {
    setPickerMode('time');
    setShowTimePicker(true);
  };
  
  // Fonction pour gérer le changement de date ou d'heure
  const handleDateTimeChange = (event: any, selectedDateTime?: Date) => {
    const currentDate = selectedDateTime || selectedDate;
    
    // Sur Android, le sélecteur se ferme automatiquement après la sélection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
    
    if (selectedDateTime) {
      setSelectedDate(currentDate);
      setUseCustomDate(true);
    }
  };
  
  // Fonction pour fermer les modaux (principalement pour iOS)
  const hidePicker = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  // Fonction pour réinitialiser la date et utiliser la date actuelle
  const resetToCurrentDateTime = () => {
    setSelectedDate(new Date());
    setUseCustomDate(false);
  };

  const handleSave = async () => {
    if (!value || isNaN(Number(value))) {
      toast.show(t('common.error'), t('add.errors.invalidValue'));
      return;
    }

    const numericValue = Number(value);
    
    // Validation selon l'unité
    const minValue = userSettings.unit === 'mgdl' ? 20 : 1.1;
    const maxValue = userSettings.unit === 'mgdl' ? 600 : 33.3;
    const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';
    
    if (numericValue < minValue || numericValue > maxValue) {
      toast.show(t('common.error'), t('add.errors.outOfRange', { min: minValue, max: maxValue, unit: unitLabel }));
      return;
    }

    setSaving(true);
    try {
      const measurement: Omit<GlucoseMeasurement, 'id'> = {
        value: numericValue,
        type: MEASUREMENT_TYPES.find(t => t.id === selectedType)?.label || 'À jeun',
        timestamp: useCustomDate ? selectedDate.getTime() : Date.now(),
        notes: notes.trim() || undefined,
      };

      await StorageManager.addMeasurement(measurement);
      
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

      toast.show(t('common.success'), message);
      
      // Reset form
      setValue('');
      setSelectedType('fasting');
      setNotes('');
    } catch (error) {
      toast.show(t('common.error'), t('add.errors.saveFailed'));
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

            <View style={styles.timeContainer}>
              <Text style={styles.label}>{t('add.dateTime')}</Text>
              
              <View style={styles.timeInfo}>
                <TouchableOpacity 
                  style={[styles.timePickerButton, useCustomDate && styles.timePickerButtonActive]} 
                  onPress={showDatePickerModal}>
                  <View style={styles.timeItem}>
                    <Calendar size={16} color={useCustomDate ? "#667EEA" : "#6B7280"} />
                    <Text style={[styles.timeText, useCustomDate && styles.timeTextActive]}>
                      {selectedDate.toLocaleDateString(userSettings.language === 'fr' ? 'fr-FR' : 'en-US')}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timePickerButton, useCustomDate && styles.timePickerButtonActive]} 
                  onPress={showTimePickerModal}>
                  <View style={styles.timeItem}>
                    <Clock size={16} color={useCustomDate ? "#667EEA" : "#6B7280"} />
                    <Text style={[styles.timeText, useCustomDate && styles.timeTextActive]}>
                      {selectedDate.toLocaleTimeString(userSettings.language === 'fr' ? 'fr-FR' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {useCustomDate && (
                  <TouchableOpacity
                    style={styles.resetTimeButton}
                    onPress={resetToCurrentDateTime}
                  >
                    <Text style={styles.resetTimeButtonText}>{t('add.useCurrentTime')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* DateTimePicker natif pour mobile */}
              {Platform.OS !== 'web' && (showDatePicker || showTimePicker) && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={selectedDate}
                  mode={pickerMode}
                  is24Hour={userSettings.language === 'fr'} // 24h format pour le français, 12h pour l'anglais
                  display="default"
                  onChange={handleDateTimeChange}
                  maximumDate={new Date()} // Ne pas permettre de dates futures
                />
              )}
              
              {/* Modaux pour le web */}
              {Platform.OS === 'web' && showDatePicker && (
                <Modal
                  visible={showDatePicker}
                  transparent={true}
                  animationType="slide"
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>{t('add.selectDate')}</Text>
                      <input 
                        type="date"
                        style={{fontSize: 16, padding: 10, margin: 10, width: '80%'}}
                        value={selectedDate.toISOString().split('T')[0]}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            const newDate = new Date(selectedDate);
                            newDate.setFullYear(year);
                            newDate.setMonth(month - 1);
                            newDate.setDate(day);
                            setSelectedDate(newDate);
                            setUseCustomDate(true);
                          }
                        }}
                      />
                      <TouchableOpacity 
                        style={styles.modalButton} 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.modalButtonText}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
              
              {Platform.OS === 'web' && showTimePicker && (
                <Modal
                  visible={showTimePicker}
                  transparent={true}
                  animationType="slide"
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>{t('add.selectTime')}</Text>
                      <input 
                        type="time"
                        style={{fontSize: 16, padding: 10, margin: 10, width: '80%'}}
                        value={`${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = new Date(selectedDate);
                            newDate.setHours(hours);
                            newDate.setMinutes(minutes);
                            setSelectedDate(newDate);
                            setUseCustomDate(true);
                          }
                        }}
                      />
                      <TouchableOpacity 
                        style={styles.modalButton} 
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={styles.modalButtonText}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
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
  timeContainer: {
    marginBottom: 24,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
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
  timeTextActive: {
    color: '#667EEA',
    fontWeight: '500',
  },
  timePickerButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    backgroundColor: '#F7FAFC',
    marginRight: 8,
    marginBottom: 8,
    minWidth: '45%',
  },
  timePickerButtonActive: {
    borderColor: '#667EEA',
    backgroundColor: '#EDF2F7',
  },
  resetTimeButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  resetTimeButtonText: {
    color: '#667EEA',
    fontWeight: '500',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#667EEA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateInputsContainer: {
    width: '100%',
    marginVertical: 15,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 16,
    width: '30%',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: '60%',
    textAlign: 'center',
  },
  timeInputsContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  timeInputRow: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    width: 60,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    marginHorizontal: 10,
    fontWeight: 'bold',
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