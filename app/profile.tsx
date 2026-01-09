import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { User, Mail, Calendar, Shield, Trash2 } from 'lucide-react-native';
import { deleteUser } from 'firebase/auth';
import { useToast } from '@/hooks/useToast';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { userSettings, updateUserSetting } = useSettings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [name, setName] = useState(userSettings.name);
  const [age, setAge] = useState(userSettings.age);
  const [gender, setGender] = useState(userSettings.gender);
  const [weight, setWeight] = useState(userSettings.weight);
  const [height, setHeight] = useState(userSettings.height);
  const [medicalId, setMedicalId] = useState(userSettings.medicalId);
  const [doctorName, setDoctorName] = useState(userSettings.doctorName);
  const [medicalConditions, setMedicalConditions] = useState(userSettings.medicalConditions.join(', '));
  const [medications, setMedications] = useState(userSettings.medications.join(', '));

  useEffect(() => {
    setName(userSettings.name);
    setAge(userSettings.age);
    setGender(userSettings.gender);
    setWeight(userSettings.weight);
    setHeight(userSettings.height);
    setMedicalId(userSettings.medicalId);
    setDoctorName(userSettings.doctorName);
    setMedicalConditions(userSettings.medicalConditions.join(', '));
    setMedications(userSettings.medications.join(', '));
  }, [
    userSettings.name,
    userSettings.age,
    userSettings.gender,
    userSettings.weight,
    userSettings.height,
    userSettings.medicalId,
    userSettings.doctorName,
    userSettings.medicalConditions,
    userSettings.medications,
  ]);

  const nameError = useMemo(() => {
    if (!name.trim()) {
      return t('profile.validation.nameRequired');
    }
    return '';
  }, [name, t]);

  const numericError = (value: string, key: 'age' | 'weight' | 'height') => {
    if (!value.trim()) return '';
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      return t(`profile.validation.${key}Invalid`);
    }
    if (parsed <= 0) {
      return t(`profile.validation.${key}Positive`);
    }
    return '';
  };

  const ageError = useMemo(() => numericError(age, 'age'), [age, t]);
  const weightError = useMemo(() => numericError(weight, 'weight'), [weight, t]);
  const heightError = useMemo(() => numericError(height, 'height'), [height, t]);

  const normalizeList = (value: string) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

  const hasChanges = useMemo(() => {
    const conditions = normalizeList(medicalConditions);
    const meds = normalizeList(medications);
    return (
      name.trim() !== userSettings.name ||
      age.trim() !== userSettings.age ||
      gender.trim() !== userSettings.gender ||
      weight.trim() !== userSettings.weight ||
      height.trim() !== userSettings.height ||
      medicalId.trim() !== userSettings.medicalId ||
      doctorName.trim() !== userSettings.doctorName ||
      JSON.stringify(conditions) !== JSON.stringify(userSettings.medicalConditions) ||
      JSON.stringify(meds) !== JSON.stringify(userSettings.medications)
    );
  }, [
    name,
    age,
    gender,
    weight,
    height,
    medicalId,
    doctorName,
    medicalConditions,
    medications,
    userSettings,
  ]);

  const canSave = !nameError && !ageError && !weightError && !heightError && hasChanges && !saving;

  const handleDeleteAccount = () => {
    toast.show(
      t('profile.deleteAccount'),
      t('profile.deleteAccountWarning'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Note: Pour la suppression de compte, il faut généralement re-authentifier l'utilisateur
      // Ici, nous allons simplement supprimer le compte directement
      await deleteUser(user);
      toast.show(
        t('profile.accountDeleted'),
        t('profile.accountDeletedMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/auth'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur lors de la suppression du compte:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        toast.show(
          t('profile.recentLoginRequired'),
          t('profile.recentLoginRequiredMessage'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('auth.login'),
              onPress: () => {
                logout();
                router.replace('/auth');
              },
            },
          ]
        );
      } else {
        toast.show(
          t('common.error'),
          t('profile.deleteAccountError')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('profile.notAvailable');
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return t('profile.notAvailable');
    }
  };

  const handleSaveProfile = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updates: Array<Promise<void>> = [];
      const trimmedName = name.trim();
      const trimmedAge = age.trim();
      const trimmedGender = gender.trim();
      const trimmedWeight = weight.trim();
      const trimmedHeight = height.trim();
      const trimmedMedicalId = medicalId.trim();
      const trimmedDoctorName = doctorName.trim();
      const conditions = normalizeList(medicalConditions);
      const meds = normalizeList(medications);

      if (trimmedName !== userSettings.name) {
        updates.push(updateUserSetting('name', trimmedName));
      }
      if (trimmedAge !== userSettings.age) {
        updates.push(updateUserSetting('age', trimmedAge));
      }
      if (trimmedGender !== userSettings.gender) {
        updates.push(updateUserSetting('gender', trimmedGender));
      }
      if (trimmedWeight !== userSettings.weight) {
        updates.push(updateUserSetting('weight', trimmedWeight));
      }
      if (trimmedHeight !== userSettings.height) {
        updates.push(updateUserSetting('height', trimmedHeight));
      }
      if (trimmedMedicalId !== userSettings.medicalId) {
        updates.push(updateUserSetting('medicalId', trimmedMedicalId));
      }
      if (trimmedDoctorName !== userSettings.doctorName) {
        updates.push(updateUserSetting('doctorName', trimmedDoctorName));
      }
      if (JSON.stringify(conditions) !== JSON.stringify(userSettings.medicalConditions)) {
        updates.push(updateUserSetting('medicalConditions', conditions));
      }
      if (JSON.stringify(meds) !== JSON.stringify(userSettings.medications)) {
        updates.push(updateUserSetting('medications', meds));
      }

      await Promise.all(updates);
      toast.show(t('common.success'), t('profile.saveSuccess'));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      toast.show(t('common.error'), t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('profile.notSignedIn')}</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/auth')}
          >
            <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('profile.subtitle')}</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#667EEA" />
            <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
          </View>
          <Text style={styles.sectionDescription}>{t('settings.profileNote')}</Text>

          <Text style={styles.inputLabel}>{t('settings.name')}</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            value={name}
            onChangeText={setName}
            placeholder={t('settings.name')}
            placeholderTextColor="#9CA3AF"
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

          <Text style={styles.inputLabel}>{t('settings.age')}</Text>
          <TextInput
            style={[styles.input, ageError ? styles.inputError : null]}
            value={age}
            onChangeText={setAge}
            placeholder={t('settings.age')}
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
          {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}

          <Text style={styles.inputLabel}>{t('settings.gender')}</Text>
          <TextInput
            style={styles.input}
            value={gender}
            onChangeText={setGender}
            placeholder={t('settings.gender')}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.inputLabel}>{t('settings.weight')}</Text>
          <TextInput
            style={[styles.input, weightError ? styles.inputError : null]}
            value={weight}
            onChangeText={setWeight}
            placeholder={t('settings.weight')}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
          {weightError ? <Text style={styles.errorText}>{weightError}</Text> : null}

          <Text style={styles.inputLabel}>{t('settings.height')}</Text>
          <TextInput
            style={[styles.input, heightError ? styles.inputError : null]}
            value={height}
            onChangeText={setHeight}
            placeholder={t('settings.height')}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
          {heightError ? <Text style={styles.errorText}>{heightError}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#667EEA" />
            <Text style={styles.sectionTitle}>{t('settings.medicalInfo')}</Text>
          </View>

          <Text style={styles.inputLabel}>{t('settings.medicalId')}</Text>
          <TextInput
            style={styles.input}
            value={medicalId}
            onChangeText={setMedicalId}
            placeholder={t('settings.medicalId')}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.inputLabel}>{t('settings.doctorName')}</Text>
          <TextInput
            style={styles.input}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder={t('settings.doctorName')}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.inputLabel}>{t('settings.medicalConditions')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholder={t('settings.medicalConditionsPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
          />

          <Text style={styles.inputLabel}>{t('settings.medications')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={medications}
            onChangeText={setMedications}
            placeholder={t('settings.medicationsPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
          />

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#667EEA" />
            <Text style={styles.sectionTitle}>{t('profile.userInfo')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Mail size={16} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('auth.email')}</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={16} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.accountCreated')}</Text>
              <Text style={styles.infoValue}>
                {formatDate(user.metadata.creationTime)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Shield size={16} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.lastSignIn')}</Text>
              <Text style={styles.infoValue}>
                {formatDate(user.metadata.lastSignInTime)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Shield size={16} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.emailVerified')}</Text>
              <Text style={[
                styles.infoValue,
                { color: user.emailVerified ? '#10B981' : '#EF4444' }
              ]}>
                {user.emailVerified ? t('profile.verified') : t('profile.notVerified')}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountActions')}</Text>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutButtonText}>{t('settings.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.disabledButton]}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Trash2 size={16} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>{t('profile.deleteAccount')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#64748b',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    marginTop: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
