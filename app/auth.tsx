import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { auth } from '@/utils/internalAuth';
import { useToast } from '@/hooks/useToast';

type AuthMode = 'login' | 'register' | 'reset';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      toast.show(t('auth.error'), t('auth.invalidEmail'));
      return;
    }

    if (!validatePassword(password)) {
      toast.show(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await auth.login(email, password);
      toast.show(t('auth.success'), t('auth.loginSuccess'));
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      let errorMessage = t('auth.loginError');
      const message = error?.message || '';
      if (message.includes('not-found') || message.includes('not found')) {
        errorMessage = t('auth.userNotFound');
      } else if (message.includes('invalid-password') || message.includes('wrong-password') || message.includes('invalid password')) {
        errorMessage = t('auth.wrongPassword');
      } else if (message.includes('invalid-email')) {
        errorMessage = t('auth.invalidEmail');
      } else if (message.includes('disabled')) {
        errorMessage = t('auth.userDisabled');
      } else {
        errorMessage = `${t('auth.loginError')}: ${message}`;
      }
      
      toast.show(t('auth.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateEmail(email)) {
      toast.show(t('auth.error'), t('auth.invalidEmail'));
      return;
    }

    if (!validatePassword(password)) {
      toast.show(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.show(t('auth.error'), t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await auth.register(email, password);
      toast.show(t('auth.success'), t('auth.registerSuccess'));
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Erreur de création de compte:', error);
      let errorMessage = t('auth.registerError');
      const message = error?.message || '';
      if (message.includes('already') || message.includes('exists')) {
        errorMessage = t('auth.emailAlreadyInUse');
      } else if (message.includes('invalid-email')) {
        errorMessage = t('auth.invalidEmail');
      } else if (message.includes('password')) {
        errorMessage = t('auth.weakPassword');
      } else {
        errorMessage = `${t('auth.registerError')}: ${message}`;
      }
      
      toast.show(t('auth.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!validateEmail(email)) {
      toast.show(t('auth.error'), t('auth.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      await auth.requestPasswordReset(email);
      toast.show(t('auth.success'), t('auth.passwordResetSent'));
      setMode('login');
    } catch (error: any) {
      console.error('Erreur de réinitialisation:', error);
      toast.show(t('auth.error'), t('auth.passwordResetError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    switch (mode) {
      case 'login':
        handleLogin();
        break;
      case 'register':
        handleRegister();
        break;
      case 'reset':
        handlePasswordReset();
        break;
    }
  };

  const renderForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>
        {mode === 'login' ? t('auth.login') : 
         mode === 'register' ? t('auth.register') : 
         t('auth.resetPassword')}
      </Text>
      
      <Text style={styles.subtitle}>
        {mode === 'login' ? t('auth.loginSubtitle') : 
         mode === 'register' ? t('auth.registerSubtitle') : 
         t('auth.resetSubtitle')}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!loading}
      />

      {mode !== 'reset' && (
        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
        />
      )}

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder={t('auth.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
        />
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {mode === 'login' ? t('auth.login') : 
             mode === 'register' ? t('auth.register') : 
             t('auth.sendResetEmail')}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        {mode === 'login' && (
          <>
            <TouchableOpacity onPress={() => setMode('register')}>
              <Text style={styles.linkText}>{t('auth.noAccount')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('reset')}>
              <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          </>
        )}
        
        {mode === 'register' && (
          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.linkText}>{t('auth.hasAccount')}</Text>
          </TouchableOpacity>
        )}
        
        {mode === 'reset' && (
          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.linkText}>{t('auth.backToLogin')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.appName}>GlycoFlex</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </View>
        
        {renderForm()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667EEA',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#667EEA',
    fontSize: 14,
    marginVertical: 4,
    textDecorationLine: 'underline',
  },
});
