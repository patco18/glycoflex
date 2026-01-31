/**
 * Gestionnaire de stockage unifié pour GlycoFlex
 * Simplifie l'interface entre stockage local et cloud
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/utils/internalAuth';
import { getCloudStorageProvider } from './cloudStorageProvider';
import { GlucoseMeasurement, generateMeasurementId } from './storage';

// Configuration du stockage (utilise les mêmes clés que le stockage cloud)
const STORAGE_CONFIG = {
  LOCAL_KEY: 'glucose_measurements', // Utiliser la même clé que storage.ts
  SYNC_ENABLED_KEY: 'secure_cloud_sync_enabled', // Même clé que le stockage cloud
  LAST_SYNC_KEY: 'last_secure_cloud_sync', // Même clé que le stockage cloud
  ERROR_LOG_KEY: 'storage_manager_error_log'
};

interface StorageError {
  timestamp: number;
  operation: string;
  error: string;
  context?: any;
}

export class StorageManager {
  private static syncEnabled: boolean | null = null;
  private static errorLog: StorageError[] = [];

  /**
   * Initialiser le gestionnaire de stockage
   */
  static async initialize(): Promise<void> {
    console.log('🚀 Initialisation du gestionnaire de stockage...');
    
    try {
      const { hybrid } = getCloudStorageProvider();
      // Vérifier l'état de synchronisation
      this.syncEnabled = await this.isSyncEnabled();
      
      // Charger le log d'erreurs
      await this.loadErrorLog();
      
      if (this.syncEnabled && auth.currentUser) {
        console.log('✅ Mode synchronisé activé');
        await hybrid.initialize();
      } else {
        console.log('📱 Mode local uniquement');
      }
      
      console.log('✅ Gestionnaire de stockage initialisé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du stockage:', error);
      await this.logError('initialize', error);
    }
  }

  /**
   * Ajouter une mesure (unifie local et cloud)
   */
  static async addMeasurement(measurement: Omit<GlucoseMeasurement, 'id'>): Promise<GlucoseMeasurement> {
    try {
      const { hybrid } = getCloudStorageProvider();
      // Si sync activé et utilisateur connecté, utiliser directement le stockage cloud
      if (this.syncEnabled && auth.currentUser) {
        try {
          const savedMeasurement = await hybrid.addMeasurement(measurement);
          console.log('☁️ Mesure ajoutée via le stockage cloud');
          return savedMeasurement;
        } catch (cloudError) {
          console.warn('⚠️ Échec stockage cloud, fallback vers local:', cloudError);
          await this.logError('addMeasurement_hybrid', cloudError);
          // Fallback vers stockage local en cas d'échec
        }
      }

      // Fallback : stockage local uniquement
      const newMeasurement: GlucoseMeasurement = {
        ...measurement,
        id: generateMeasurementId(),
      };

      await this.saveToLocal(newMeasurement);
      console.log('📱 Mesure sauvegardée localement');

      return newMeasurement;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de mesure:', error);
      await this.logError('addMeasurement', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les mesures
   */
  static async getMeasurements(): Promise<GlucoseMeasurement[]> {
    try {
      let measurements: GlucoseMeasurement[] = [];

      // Si sync activé et utilisateur connecté, priorité au cloud
      if (this.syncEnabled && auth.currentUser) {
        try {
          const { hybrid } = getCloudStorageProvider();
          measurements = await hybrid.getMeasurements();
          console.log(`☁️ ${measurements.length} mesures récupérées du cloud`);
          
          // Mettre à jour le cache local avec les données cloud
          await this.updateLocalCache(measurements);
          
          return measurements;
        } catch (cloudError) {
          console.warn('⚠️ Échec récupération cloud, utilisation données locales:', cloudError);
          await this.logError('getMeasurements_cloud', cloudError);
        }
      }

      // Fallback: données locales
      measurements = await this.getFromLocal();
      console.log(`📱 ${measurements.length} mesures récupérées localement`);
      
      return measurements;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des mesures:', error);
      await this.logError('getMeasurements', error);
      return [];
    }
  }

  /**
   * Supprimer une mesure
   */
  static async deleteMeasurement(id: string): Promise<void> {
    try {
      // Supprimer localement
      await this.deleteFromLocal(id);

      // Si sync activé, supprimer du cloud
      if (this.syncEnabled && auth.currentUser) {
        try {
          const { hybrid } = getCloudStorageProvider();
          await hybrid.deleteMeasurement(id);
          console.log('☁️ Mesure supprimée du cloud');
        } catch (cloudError) {
          console.warn('⚠️ Échec suppression cloud, mesure locale supprimée:', cloudError);
          await this.logError('deleteMeasurement_cloud', cloudError, { measurementId: id });
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      await this.logError('deleteMeasurement', error);
      throw error;
    }
  }

  /**
   * Activer/désactiver la synchronisation
   */
  static async setSyncEnabled(enabled: boolean): Promise<void> {
    try {
      this.syncEnabled = enabled;
      await AsyncStorage.setItem(STORAGE_CONFIG.SYNC_ENABLED_KEY, enabled.toString());
      
      if (enabled) {
        if (!auth.currentUser) {
          throw new Error('Utilisateur non connecté');
        }
        const { hybrid } = getCloudStorageProvider();
        await hybrid.setSyncEnabled(true);
        console.log('✅ Synchronisation activée');
      } else {
        const { hybrid } = getCloudStorageProvider();
        await hybrid.setSyncEnabled(false);
        console.log('⚠️ Synchronisation désactivée');
      }
    } catch (error) {
      console.error('❌ Erreur lors du changement de synchronisation:', error);
      await this.logError('setSyncEnabled', error);
      throw error;
    }
  }

  /**
   * Vérifier si la synchronisation est activée
   */
  static async isSyncEnabled(): Promise<boolean> {
    if (this.syncEnabled !== null) return this.syncEnabled;
    
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_CONFIG.SYNC_ENABLED_KEY);
      this.syncEnabled = enabled === 'true';
      return this.syncEnabled;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification sync:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de stockage
   */
  static async getStorageStats(): Promise<{
    localCount: number;
    cloudCount: number;
    syncEnabled: boolean;
    lastSync: number | null;
    errorCount: number;
  }> {
    try {
      const local = await this.getFromLocal();
      let cloudCount = 0;
      
      if (this.syncEnabled && auth.currentUser) {
        try {
          const { hybrid } = getCloudStorageProvider();
          const cloud = await hybrid.getMeasurements();
          cloudCount = cloud.length;
        } catch {
          cloudCount = -1; // Indique une erreur
        }
      }

      const lastSyncStr = await AsyncStorage.getItem(STORAGE_CONFIG.LAST_SYNC_KEY);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr) : null;

      return {
        localCount: local.length,
        cloudCount,
        syncEnabled: this.syncEnabled || false,
        lastSync,
        errorCount: this.errorLog.length
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stats:', error);
      return {
        localCount: 0,
        cloudCount: 0,
        syncEnabled: false,
        lastSync: null,
        errorCount: this.errorLog.length
      };
    }
  }

  /**
   * Forcer une synchronisation complète
   */
  static async forceSyncNow(): Promise<void> {
    if (!this.syncEnabled || !auth.currentUser) {
      throw new Error('Synchronisation non disponible');
    }

    try {
      console.log('🔄 Synchronisation forcée en cours...');
      const { hybrid } = getCloudStorageProvider();
      await hybrid.syncWithCloud();
      await AsyncStorage.setItem(STORAGE_CONFIG.LAST_SYNC_KEY, Date.now().toString());
      console.log('✅ Synchronisation forcée terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation forcée:', error);
      await this.logError('forceSyncNow', error);
      throw error;
    }
  }

  /**
   * Nettoyer les erreurs et données corrompues
   */
  static async cleanup(): Promise<void> {
    try {
      // Vider le log d'erreurs
      this.errorLog = [];
      await AsyncStorage.removeItem(STORAGE_CONFIG.ERROR_LOG_KEY);
      
      // Si sync activé, nettoyer aussi le cloud
      if (this.syncEnabled && auth.currentUser) {
        // Reset des IDs corrompus trackés
        await AsyncStorage.removeItem('corrupted_docs_ignore_v1');
        await AsyncStorage.removeItem('skipped_corrupted_upload_ids_v1');
      }
      
      console.log('✅ Nettoyage terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }

  // ============ MÉTHODES PRIVÉES ============

  private static async saveToLocal(measurement: GlucoseMeasurement): Promise<void> {
    const measurements = await this.getFromLocal();
    measurements.unshift(measurement);
    await AsyncStorage.setItem(STORAGE_CONFIG.LOCAL_KEY, JSON.stringify(measurements));
  }

  private static async getFromLocal(): Promise<GlucoseMeasurement[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_CONFIG.LOCAL_KEY);
      if (stored) {
        const measurements = JSON.parse(stored);
        return measurements.sort((a: GlucoseMeasurement, b: GlucoseMeasurement) => b.timestamp - a.timestamp);
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur lecture stockage local:', error);
      return [];
    }
  }

  private static async deleteFromLocal(id: string): Promise<void> {
    const measurements = await this.getFromLocal();
    const filtered = measurements.filter(m => m.id !== id);
    await AsyncStorage.setItem(STORAGE_CONFIG.LOCAL_KEY, JSON.stringify(filtered));
  }

  private static async updateLocalCache(cloudMeasurements: GlucoseMeasurement[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_CONFIG.LOCAL_KEY, JSON.stringify(cloudMeasurements));
    } catch (error) {
      console.warn('⚠️ Échec mise à jour cache local:', error);
    }
  }

  private static async logError(operation: string, error: any, context?: any): Promise<void> {
    try {
      const errorEntry: StorageError = {
        timestamp: Date.now(),
        operation,
        error: error?.message || String(error),
        context
      };
      
      this.errorLog.push(errorEntry);
      
      // Limiter le log à 50 entrées
      if (this.errorLog.length > 50) {
        this.errorLog = this.errorLog.slice(-50);
      }
      
      await AsyncStorage.setItem(STORAGE_CONFIG.ERROR_LOG_KEY, JSON.stringify(this.errorLog));
    } catch {
      // Ignorer les erreurs de logging
    }
  }

  private static async loadErrorLog(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_CONFIG.ERROR_LOG_KEY);
      this.errorLog = stored ? JSON.parse(stored) : [];
    } catch {
      this.errorLog = [];
    }
  }

  /**
   * Obtenir le log d'erreurs
   */
  static getErrorLog(): StorageError[] {
    return [...this.errorLog];
  }
}
