import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, RefreshCcw, Check } from 'lucide-react-native';
import { resetAppData, resetLocalFirebaseData } from '@/utils/resetFirebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Écran de réinitialisation complète de l'application Firebase
 */
export default function ResetAppScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCompleteReset = async () => {
    Alert.alert(
      'Réinitialisation complète',
      'Cette action va effacer toutes vos données locales et vous déconnecter. Cette opération est irréversible et doit être utilisée uniquement après avoir recréé un nouveau projet Firebase.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Déconnecter l'utilisateur si connecté
              if (user) {
                await logout();
              }
              
              // Réinitialiser toutes les données
              await resetLocalFirebaseData();
              
              setSuccess(true);
              
              setTimeout(() => {
                Alert.alert(
                  'Réinitialisation terminée',
                  'L\'application a été réinitialisée avec succès. Veuillez redémarrer l\'application pour appliquer tous les changements.',
                  [{ text: 'OK' }]
                );
              }, 500);
              
            } catch (error) {
              Alert.alert(
                'Erreur',
                `Une erreur s'est produite pendant la réinitialisation: ${String(error)}`,
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Réinitialisation Firebase</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.warningCard}>
          <AlertTriangle size={48} color="#E53E3E" style={styles.warningIcon} />
          <Text style={styles.warningTitle}>Zone de danger</Text>
          <Text style={styles.warningText}>
            Cette page permet de réinitialiser complètement l'application pour une nouvelle configuration Firebase.
            Utilisez cette fonctionnalité uniquement si vous avez recréé un nouveau projet Firebase et mis à jour
            les fichiers de configuration.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Ce processus va :</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoText}>• Supprimer toutes les données de synchronisation locales</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoText}>• Réinitialiser les clés de chiffrement</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoText}>• Effacer toutes les informations d'authentification</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoText}>• Préparer l'application pour une nouvelle configuration Firebase</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.resetButton,
            (loading || success) && styles.disabledButton
          ]}
          onPress={handleCompleteReset}
          disabled={loading || success}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : success ? (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>Réinitialisation terminée</Text>
            </>
          ) : (
            <>
              <RefreshCcw size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>Réinitialiser complètement</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3182CE',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  warningCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CBD5E0',
    opacity: 0.8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
