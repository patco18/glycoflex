import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/config/firebase';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { DataCleaner } from '@/utils/dataCleaner';
import { useToast } from '@/hooks/useToast';

/**
 * Écran de test pour les permissions Firebase
 * Permet de tester différentes opérations Firestore
 * et vérifier que les règles de sécurité fonctionnent correctement
 */
export default function FirebaseTestScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const diagnosticsEnabled = useMemo(() => {
    return __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DIAGNOSTICS === 'true';
  }, []);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      router.replace('/welcome');
    }
  }, [diagnosticsEnabled, router]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const runTests = async () => {
    if (!user) {
      addLog("❌ Aucun utilisateur connecté! Connectez-vous d'abord.");
      return;
    }
    
    setIsRunning(true);
    clearLogs();
    addLog(`🔍 Début des tests pour l'utilisateur ${user.email}`);
    
    try {
      // Test 1: Écrire dans users/{userId}
      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          lastTested: new Date().toISOString(),
          testValue: Math.random().toString(36).substring(2)
        }, { merge: true });
        addLog("✅ Test 1: Écriture dans users/{userId} réussie");
      } catch (error: any) {
        addLog(`❌ Test 1: Échec d'écriture dans users/${user.uid}`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 2: Lire depuis users/{userId}
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        addLog(`✅ Test 2: Lecture de users/${user.uid} réussie`);
        if (userDoc.exists()) {
          addLog(`   Données: ${JSON.stringify(userDoc.data(), null, 2).substring(0, 100)}...`);
        } else {
          addLog(`   Le document n'existe pas`);
        }
      } catch (error: any) {
        addLog(`❌ Test 2: Échec de lecture depuis users/${user.uid}`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 3: Écrire dans encrypted_measurements
      const testMeasurementId = `test_${Date.now()}`;
      try {
        await setDoc(doc(db, "encrypted_measurements", `${user.uid}_${testMeasurementId}`), {
          userId: user.uid,
          encryptedData: "test_encrypted_data",
          timestamp: Date.now()
        });
        addLog(`✅ Test 3: Écriture dans encrypted_measurements réussie`);
      } catch (error: any) {
        addLog(`❌ Test 3: Échec d'écriture dans encrypted_measurements`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 4: Lire depuis encrypted_measurements
      try {
        const q = query(
          collection(db, "encrypted_measurements"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        addLog(`✅ Test 4: Lecture depuis encrypted_measurements réussie`);
        addLog(`   ${querySnapshot.size} documents trouvés`);
      } catch (error: any) {
        addLog(`❌ Test 4: Échec de lecture depuis encrypted_measurements`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 5: Écrire dans sync_metadata
      try {
        await setDoc(doc(db, "sync_metadata", `${user.uid}_${testMeasurementId}`), {
          userId: user.uid,
          deviceId: "test_device",
          timestamp: Date.now()
        });
        addLog(`✅ Test 5: Écriture dans sync_metadata réussie`);
      } catch (error: any) {
        addLog(`❌ Test 5: Échec d'écriture dans sync_metadata`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 6: Lire depuis sync_metadata
      try {
        const q = query(
          collection(db, "sync_metadata"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        addLog(`✅ Test 6: Lecture depuis sync_metadata réussie`);
        addLog(`   ${querySnapshot.size} documents trouvés`);
      } catch (error: any) {
        addLog(`❌ Test 6: Échec de lecture depuis sync_metadata`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 7: Écrire dans devices
      const testDeviceId = `test_device_${Date.now()}`;
      try {
        await setDoc(doc(db, "devices", testDeviceId), {
          userId: user.uid,
          name: "Test Device",
          lastSync: Date.now()
        });
        addLog(`✅ Test 7: Écriture dans devices réussie`);
      } catch (error: any) {
        addLog(`❌ Test 7: Échec d'écriture dans devices`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Test 8: Lire depuis devices
      try {
        const q = query(
          collection(db, "devices"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        addLog(`✅ Test 8: Lecture depuis devices réussie`);
        addLog(`   ${querySnapshot.size} documents trouvés`);
      } catch (error: any) {
        addLog(`❌ Test 8: Échec de lecture depuis devices`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      // Nettoyage - supprimer les documents de test
      try {
        await deleteDoc(doc(db, "encrypted_measurements", `${user.uid}_${testMeasurementId}`));
        await deleteDoc(doc(db, "sync_metadata", `${user.uid}_${testMeasurementId}`));
        await deleteDoc(doc(db, "devices", testDeviceId));
        addLog("✅ Nettoyage: Documents de test supprimés");
      } catch (error: any) {
        addLog(`⚠️ Nettoyage: Erreur lors de la suppression des documents de test`);
        addLog(`   Erreur: ${error.message || String(error)}`);
      }
      
      addLog("🎉 Tests terminés");
    } catch (error: any) {
      addLog(`❌ Erreur globale: ${error.message || String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  // Fonction pour analyser et nettoyer les données corrompues
  const cleanCorruptedData = async () => {
    if (!user) {
      addLog("❌ Aucun utilisateur connecté! Connectez-vous d'abord.");
      return;
    }
    
    setIsRunning(true);
    clearLogs();
    addLog(`🔍 Analyse des données pour l'utilisateur ${user.email}`);
    
    try {
      // Analyser d'abord
      const stats = await DataCleaner.analyzeUserData(user.uid);
      addLog(`📊 Analyse terminée:`);
      addLog(`   Total de documents: ${stats.totalDocuments}`);
      addLog(`   Documents potentiellement corrompus: ${stats.potentiallyCorrupted}`);
      
      if (stats.corruptedIds.length > 0) {
        addLog(`🔎 Documents problématiques trouvés:`);
        stats.corruptedIds.forEach(id => {
          addLog(`   - ${id}`);
        });
        
        // Demander confirmation pour le nettoyage
        toast.show(
          'Documents corrompus détectés',
          `${stats.potentiallyCorrupted} documents potentiellement corrompus ont été trouvés. Voulez-vous les marquer comme corrompus?`,
          [
            {
              text: 'Annuler',
              style: 'cancel',
              onPress: () => addLog("❎ Nettoyage annulé par l'utilisateur")
            },
            {
              text: 'Marquer',
              onPress: async () => {
                addLog('🧹 Début du nettoyage (mode: marquage)...');
                const processed = await DataCleaner.cleanCorruptedMeasurements(user.uid, 'flag');
                addLog(`✅ Nettoyage terminé: ${processed} documents traités`);
              }
            },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                addLog('🗑️ Début du nettoyage (mode: suppression)...');
                const processed = await DataCleaner.cleanCorruptedMeasurements(user.uid, 'delete');
                addLog(`✅ Nettoyage terminé: ${processed} documents supprimés`);
              }
            }
          ]
        );
      } else {
        addLog('✅ Aucun document corrompu trouvé!');
      }
    } catch (error: any) {
      addLog(`❌ Erreur pendant l'analyse/nettoyage: ${error.message || String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  if (!diagnosticsEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Accès refusé</Text>
        <Text style={styles.accessDeniedMessage}>
          Les tests Firebase sont désactivés pour cet environnement.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test des Permissions Firebase</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.userInfoText}>
          {user ? `Connecté en tant que: ${user.email}` : 'Non connecté'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, isRunning ? styles.buttonDisabled : {}]} 
        onPress={runTests}
        disabled={isRunning || !user}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Tests en cours...' : 'Exécuter les tests'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.cleanButton, isRunning ? styles.buttonDisabled : {}]} 
        onPress={cleanCorruptedData}
        disabled={isRunning || !user}
      >
        <Text style={styles.cleanButtonText}>
          {isRunning ? 'Traitement...' : 'Analyser & nettoyer les données'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.logs}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logEntry}>
            {log}
          </Text>
        ))}
      </ScrollView>
      
      <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
        <Text style={styles.clearButtonText}>Effacer les logs</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  accessDeniedMessage: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  userInfoText: {
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#b0b0b0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cleanButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  cleanButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logs: {
    flex: 1,
    marginVertical: 16,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  clearButton: {
    padding: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#888',
  },
});
