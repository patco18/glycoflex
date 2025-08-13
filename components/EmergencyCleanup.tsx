/**
 * Composant de nettoyage d'urgence pour les documents corrompus
 * À utiliser temporairement pour résoudre le cycle de corruption
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { getFirestore, writeBatch, doc, getDocs, collection } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmergencyCleanup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const db = getFirestore();

  // Documents corrompus identifiés dans les logs
  const corruptedDocIds = [
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17532858029062hnac4mqp',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754611779542sl2bfk06y',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754690835915j2ik7fhl0',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_175469543215302ywej825',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_1754786109398evbrncyd0',
    '1kDJt1PYkBUdhdDnaQOQKlDE3Xx2_17550000796030c18wkn6w'
  ];

  const cleanupSpecificDocuments = async () => {
    setIsLoading(true);
    setStatus('🧹 Nettoyage des documents corrompus...');
    
    try {
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const docId of corruptedDocIds) {
        const docRef = doc(db, 'measurements', docId);
        batch.delete(docRef);
        deletedCount++;
        console.log(`🗑️ Marqué pour suppression: ${docId}`);
      }

      await batch.commit();
      setStatus(`✅ ${deletedCount} documents corrompus supprimés`);
      
      // Nettoyer le cache local
      await cleanLocalCache();
      
      Alert.alert('Succès', `${deletedCount} documents corrompus supprimés. Redémarrez l'app.`);
      
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setStatus(`❌ Erreur: ${errorMessage}`);
      Alert.alert('Erreur', `Échec du nettoyage: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const nukeAllDocuments = async () => {
    Alert.alert(
      '⚠️ ATTENTION',
      'Supprimer TOUS les documents? Cette action est irréversible!',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'SUPPRIMER TOUT', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            setStatus('💥 Suppression de TOUS les documents...');
            
            try {
              const snapshot = await getDocs(collection(db, 'measurements'));
              const batch = writeBatch(db);
              
              snapshot.docs.forEach((document) => {
                batch.delete(document.ref);
              });
              
              await batch.commit();
              setStatus(`💥 ${snapshot.docs.length} documents supprimés`);
              
              await cleanLocalCache();
              
              Alert.alert('Terminé', `${snapshot.docs.length} documents supprimés. Redémarrez l'app.`);
              
            } catch (error) {
              console.error('❌ Erreur suppression totale:', error);
              const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
              setStatus(`❌ Erreur: ${errorMessage}`);
              Alert.alert('Erreur', `Échec: ${errorMessage}`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const cleanLocalCache = async () => {
    try {
      const keys = [
        'measurements',
        'lastSyncTime',
        'existingCloudIds',
        'lastCloudDocIds',
        'syncInProgress',
        'pendingUploads'
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log('🧹 Cache local nettoyé');
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Nettoyage d'Urgence</Text>
      
      <Text style={styles.status}>{status}</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.cleanupButton]}
        onPress={cleanupSpecificDocuments}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          🧹 Supprimer Documents Corrompus
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.nukeButton]}
        onPress={nukeAllDocuments}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          💥 SUPPRIMER TOUT (Nucléaire)
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.cacheButton]}
        onPress={cleanLocalCache}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          🧹 Nettoyer Cache Local
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffe6e6',
    margin: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff0000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#cc0000',
  },
  status: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    minHeight: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  cleanupButton: {
    backgroundColor: '#ff9900',
  },
  nukeButton: {
    backgroundColor: '#ff0000',
  },
  cacheButton: {
    backgroundColor: '#0066cc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default EmergencyCleanup;
