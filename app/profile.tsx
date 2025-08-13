import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Calendar, Shield, Trash2 } from 'lucide-react-native';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
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
      Alert.alert(
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
        Alert.alert(
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
        Alert.alert(
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
