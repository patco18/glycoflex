/**
 * Utilitaire de diagnostic pour analyser les problèmes de synchronisation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/config/firebase';
import { SecureCloudStorage, EncryptionService } from './secureCloudStorage';
import { getStoredMeasurements } from './storage';

export class SyncDiagnostic {
  /**
   * Diagnostic complet de l'état de synchronisation
   */
  static async fullDiagnostic(): Promise<any> {
    console.log('🔍 === DIAGNOSTIC COMPLET DE SYNCHRONISATION ===');
    
    const result = {
      user: null as any,
      syncSettings: {} as any,
      storage: {} as any,
      cloud: {} as any,
      encryption: {} as any,
      network: {} as any,
      issues: [] as string[]
    };

    try {
      // 1. État utilisateur
      result.user = {
        authenticated: !!auth.currentUser,
        uid: auth.currentUser?.uid || 'N/A',
        email: auth.currentUser?.email || 'N/A'
      };
      console.log('👤 Utilisateur:', result.user);

      // 2. Paramètres de synchronisation
      const syncEnabled = await AsyncStorage.getItem('secure_cloud_sync_enabled');
      const lastSync = await AsyncStorage.getItem('last_secure_cloud_sync');
      const pendingOps = await AsyncStorage.getItem('pending_sync_operations');
      const corruptedIgnore = await AsyncStorage.getItem('corrupted_docs_ignore_v1');
      const skippedUpload = await AsyncStorage.getItem('skipped_corrupted_upload_ids_v1');
      
      result.syncSettings = {
        enabled: syncEnabled === 'true',
        lastSync: lastSync ? new Date(parseInt(lastSync)).toLocaleString() : 'Jamais',
        pendingOperations: pendingOps ? JSON.parse(pendingOps).length : 0,
        corruptedIgnored: corruptedIgnore ? JSON.parse(corruptedIgnore).length : 0,
        skippedUploads: skippedUpload ? JSON.parse(skippedUpload).length : 0
      };
      console.log('⚙️ Paramètres sync:', result.syncSettings);

      // 3. Stockage local
      const localMeasurements = await getStoredMeasurements();
      result.storage = {
        count: localMeasurements.length,
        measurementIds: localMeasurements.map(m => m.id),
        latestTimestamp: localMeasurements.length > 0 ? new Date(localMeasurements[0].timestamp).toLocaleString() : 'N/A'
      };
      console.log('💾 Stockage local:', result.storage);

      // 4. État du cloud
      if (auth.currentUser && syncEnabled === 'true') {
        try {
          const cloudMeasurements = await SecureCloudStorage.getMeasurements();
          const existingCloudIds = SecureCloudStorage.getExistingCloudIds();
          const corruptedDocs = SecureCloudStorage.getCorruptedDocIds();
          
          result.cloud = {
            count: cloudMeasurements.length,
            measurementIds: cloudMeasurements.map(m => m.id),
            existingIds: existingCloudIds,
            corruptedDocs: corruptedDocs,
            latestTimestamp: cloudMeasurements.length > 0 ? new Date(cloudMeasurements[0].timestamp).toLocaleString() : 'N/A'
          };
        } catch (cloudError) {
          result.cloud = { error: (cloudError as Error).message };
        }
      } else {
        result.cloud = { disabled: 'Sync désactivée ou utilisateur non connecté' };
      }
      console.log('☁️ Cloud:', result.cloud);

      // 5. État de l'encryption
      try {
        await EncryptionService.initializeEncryptionKey();
        const testData = { test: 'encryption_test', timestamp: Date.now() };
        const encrypted = EncryptionService.encrypt(testData);
        const decrypted = EncryptionService.decrypt(encrypted);
        
        result.encryption = {
          keyInitialized: true,
          testPassed: JSON.stringify(testData) === JSON.stringify(decrypted),
          encryptedSample: encrypted.substring(0, 50) + '...'
        };
      } catch (encError) {
        result.encryption = { error: (encError as Error).message };
      }
      console.log('🔐 Encryption:', result.encryption);

      // 6. Réseau (si NetInfo disponible)
      try {
        const { default: NetInfo } = await import('@react-native-community/netinfo');
        const networkState = await NetInfo.fetch();
        result.network = {
          connected: networkState.isConnected,
          type: networkState.type,
          reachable: networkState.isInternetReachable
        };
      } catch (netError) {
        result.network = { error: 'NetInfo non disponible' };
      }
      console.log('🌐 Réseau:', result.network);

      // 7. Analyse des problèmes
      const issues = this.analyzeIssues(result);
      console.log('🚨 Problèmes détectés:', issues);
      result.issues = issues;

      console.log('✅ === FIN DU DIAGNOSTIC ===');
      return result;

    } catch (error) {
      console.error('❌ Erreur pendant le diagnostic:', error);
      return { error: (error as Error).message, partialResult: result };
    }
  }

  /**
   * Analyser les problèmes potentiels
   */
  private static analyzeIssues(diagnostic: any): string[] {
    const issues: string[] = [];

    // Vérifier l'authentification
    if (!diagnostic.user.authenticated) {
      issues.push('Utilisateur non authentifié');
    }

    // Vérifier la synchronisation
    if (diagnostic.syncSettings.enabled && diagnostic.user.authenticated) {
      if (diagnostic.cloud.error) {
        issues.push(`Erreur d'accès au cloud: ${diagnostic.cloud.error}`);
      }

      if (diagnostic.storage.count > 0 && diagnostic.cloud.count === 0) {
        issues.push('Mesures locales non synchronisées vers le cloud');
      }

      if (diagnostic.syncSettings.corruptedIgnored > 0) {
        issues.push(`${diagnostic.syncSettings.corruptedIgnored} documents corrompus ignorés`);
      }

      if (diagnostic.syncSettings.skippedUploads > 0) {
        issues.push(`${diagnostic.syncSettings.skippedUploads} uploads ignorés`);
      }

      if (diagnostic.syncSettings.pendingOperations > 0) {
        issues.push(`${diagnostic.syncSettings.pendingOperations} opérations en attente`);
      }
    }

    // Vérifier l'encryption
    if (diagnostic.encryption.error) {
      issues.push(`Erreur d'encryption: ${diagnostic.encryption.error}`);
    } else if (!diagnostic.encryption.testPassed) {
      issues.push('Test d\'encryption échoué');
    }

    // Vérifier le réseau
    if (diagnostic.network.error) {
      issues.push(`Erreur réseau: ${diagnostic.network.error}`);
    } else if (!diagnostic.network.connected) {
      issues.push('Pas de connexion réseau');
    }

    return issues;
  }

  /**
   * Forcer la synchronisation des mesures locales vers le cloud
   */
  static async forceSyncLocalToCloud(): Promise<void> {
    console.log('🔄 Force sync des mesures locales vers le cloud...');
    
    try {
      const localMeasurements = await getStoredMeasurements();
      console.log(`📱 ${localMeasurements.length} mesures locales trouvées`);

      if (localMeasurements.length === 0) {
        console.log('✅ Aucune mesure locale à synchroniser');
        return;
      }

      if (!auth.currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      let syncCount = 0;
      for (const measurement of localMeasurements) {
        try {
          await SecureCloudStorage.saveMeasurement(measurement);
          syncCount++;
          console.log(`✅ Mesure ${measurement.id} synchronisée`);
        } catch (error) {
          console.error(`❌ Échec sync mesure ${measurement.id}:`, error);
        }
      }

      console.log(`🎯 Synchronisation terminée: ${syncCount}/${localMeasurements.length} mesures synchronisées`);

    } catch (error) {
      console.error('❌ Erreur lors du force sync:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les données de synchronisation
   */
  static async cleanupSyncData(): Promise<void> {
    console.log('🧹 Nettoyage des données de synchronisation...');
    
    try {
      // Nettoyer les caches et états
      await AsyncStorage.removeItem('corrupted_docs_ignore_v1');
      await AsyncStorage.removeItem('skipped_corrupted_upload_ids_v1');
      await AsyncStorage.removeItem('pending_sync_operations');
      
      // Nouveau: nettoyer aussi les uploads bloqués
      const { SecureHybridStorage } = await import('./secureCloudStorage');
      await SecureHybridStorage.forceUploadBlockedMeasurements();
      
      console.log('✅ Données de synchronisation nettoyées');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      throw error;
    }
  }

  /**
   * Test complet de la chaîne de synchronisation
   */
  static async testSyncChain(): Promise<any> {
    console.log('🧪 Test de la chaîne de synchronisation...');
    
    const testResult = {
      steps: [] as any[],
      success: false,
      error: null as any
    };

    try {
      // Étape 1: Créer une mesure de test
      const testMeasurement = {
        value: 100,
        type: 'Test Sync',
        timestamp: Date.now(),
        notes: 'Test automatique de synchronisation'
      };
      
      testResult.steps.push({ step: 'create_test_measurement', status: 'success', data: testMeasurement });

      // Étape 2: Sauvegarder localement
      const { addMeasurement } = await import('./storage');
      const saved = await addMeasurement(testMeasurement);
      testResult.steps.push({ step: 'save_local', status: 'success', id: saved.id });

      // Étape 3: Synchroniser vers le cloud
      if (auth.currentUser) {
        await SecureCloudStorage.saveMeasurement(saved);
        testResult.steps.push({ step: 'sync_to_cloud', status: 'success', id: saved.id });

        // Étape 4: Vérifier présence dans le cloud
        const cloudMeasurements = await SecureCloudStorage.getMeasurements();
        const foundInCloud = cloudMeasurements.find(m => m.id === saved.id);
        testResult.steps.push({ 
          step: 'verify_in_cloud', 
          status: foundInCloud ? 'success' : 'failed',
          found: !!foundInCloud
        });

        // Étape 5: Nettoyer la mesure de test
        const { removeMeasurement } = await import('./storage');
        await removeMeasurement(saved.id);
        await SecureCloudStorage.deleteMeasurement(saved.id);
        testResult.steps.push({ step: 'cleanup', status: 'success' });

        testResult.success = testResult.steps.every(s => s.status === 'success');
      } else {
        testResult.steps.push({ step: 'sync_to_cloud', status: 'skipped', reason: 'Utilisateur non authentifié' });
        testResult.success = false;
      }

    } catch (error) {
      testResult.error = (error as Error).message;
      testResult.steps.push({ step: 'error', status: 'failed', error: testResult.error });
    }

    console.log('🧪 Résultat du test:', testResult);
    return testResult;
  }
}
