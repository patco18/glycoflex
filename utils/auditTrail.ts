/**
 * Système d'audit et de suivi des modifications pour GlycoFlex
 * Permet de tracer les modifications des données importantes
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppLogger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Logger dédié pour l'audit
const logger = new AppLogger('AuditTrail');

/**
 * Types d'événements d'audit
 */
export enum AuditEventType {
  // Actions utilisateur
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_UPDATE_PROFILE = 'user_update_profile',
  USER_DELETE_ACCOUNT = 'user_delete_account',
  
  // Actions sur les données
  DATA_CREATE = 'data_create',
  DATA_UPDATE = 'data_update',
  DATA_DELETE = 'data_delete',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  
  // Actions de synchronisation
  SYNC_START = 'sync_start',
  SYNC_COMPLETE = 'sync_complete',
  SYNC_ERROR = 'sync_error',
  SYNC_SKIPPED = 'sync_skipped',
  
  // Actions système
  SYSTEM_ERROR = 'system_error',
  SYSTEM_SETTINGS_CHANGE = 'system_settings_change',
  SYSTEM_VERSION_UPDATE = 'system_version_update',
  
  // Actions de confidentialité
  PRIVACY_CONSENT_GIVEN = 'privacy_consent_given',
  PRIVACY_CONSENT_REVOKED = 'privacy_consent_revoked',
  PRIVACY_DATA_ACCESS = 'privacy_data_access'
}

/**
 * Entrée d'audit
 */
export interface AuditEntry {
  eventType: AuditEventType;
  userId: string;
  deviceId: string;
  timestamp: number;
  metadata: Record<string, any>;
  appVersion: string;
  isSyncedToCloud: boolean;
}

/**
 * Options pour les événements d'audit
 */
export interface AuditOptions {
  sendToCloud: boolean;   // Envoyer à Firestore
  storeLocally: boolean;  // Stocker localement
  includeMetadata: boolean; // Inclure les métadonnées
}

/**
 * Gestionnaire d'audit et de suivi des modifications
 */
export class AuditTrail {
  private userId: string | null = null;
  private deviceId: string = 'unknown_device';
  private appVersion: string = '1.0.0';
  private localAuditStorageKey: string = 'glycoflex_audit_trail';
  private localAuditMaxEntries: number = 1000; // Nombre maximum d'entrées locales
  
  /**
   * Initialise le gestionnaire d'audit
   */
  initialize(userId: string | null, deviceId: string, appVersion: string) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.appVersion = appVersion;
    this.localAuditStorageKey = `glycoflex_audit_trail_${userId || 'anonymous'}`;
    
    logger.debug('Gestionnaire d\'audit initialisé', { userId, deviceId, appVersion });
  }
  
  /**
   * Log un événement d'audit
   */
  async logEvent(
    eventType: AuditEventType,
    metadata: Record<string, any> = {},
    options: Partial<AuditOptions> = {}
  ): Promise<void> {
    const opts: AuditOptions = {
      sendToCloud: true,
      storeLocally: true,
      includeMetadata: true,
      ...options
    };
    
    if (!this.userId) {
      logger.warn('Tentative de journalisation d\'audit sans ID utilisateur');
      opts.sendToCloud = false;
    }
    
    const timestamp = Date.now();
    const entry: AuditEntry = {
      eventType,
      userId: this.userId || 'anonymous',
      deviceId: this.deviceId,
      timestamp,
      metadata: opts.includeMetadata ? metadata : {},
      appVersion: this.appVersion,
      isSyncedToCloud: false
    };
    
    // Enregistrer localement
    if (opts.storeLocally) {
      await this.storeEventLocally(entry);
    }
    
    // Envoyer à Firestore
    if (opts.sendToCloud && this.userId) {
      try {
        await this.sendToCloud(entry);
      } catch (error) {
        logger.warn('Échec de l\'envoi de l\'audit à Firestore', { 
          error: error instanceof Error ? error.message : String(error),
          eventType
        });
      }
    }
    
    logger.debug(`Événement d'audit: ${eventType}`, { 
      eventType, 
      timestamp, 
      metadata: opts.includeMetadata ? metadata : { redacted: true } 
    });
  }
  
  /**
   * Stocke un événement localement
   */
  private async storeEventLocally(entry: AuditEntry): Promise<void> {
    try {
      // Récupérer les événements existants
      let events: AuditEntry[] = [];
      const existingData = await AsyncStorage.getItem(this.localAuditStorageKey);
      
      if (existingData) {
        events = JSON.parse(existingData);
      }
      
      // Ajouter le nouvel événement
      events.push(entry);
      
      // Limiter le nombre d'entrées stockées localement
      if (events.length > this.localAuditMaxEntries) {
        events = events.slice(-this.localAuditMaxEntries);
      }
      
      // Sauvegarder
      await AsyncStorage.setItem(this.localAuditStorageKey, JSON.stringify(events));
    } catch (error) {
      logger.error('Erreur lors du stockage local de l\'événement d\'audit', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Envoie un événement à Firestore
   */
  private async sendToCloud(entry: AuditEntry): Promise<void> {
    if (!this.userId) return;
    
    try {
      const cloudEntry = {
        ...entry,
        serverTimestamp: serverTimestamp(),
        isSyncedToCloud: true
      };
      
      await addDoc(collection(db, 'user_audit_trail'), cloudEntry);
      
      // Marquer comme synchronisé dans le stockage local
      await this.markEntryAsSynced(entry.timestamp);
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de l\'audit à Firestore', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Marque une entrée comme synchronisée
   */
  private async markEntryAsSynced(timestamp: number): Promise<void> {
    try {
      // Récupérer les événements existants
      const existingData = await AsyncStorage.getItem(this.localAuditStorageKey);
      if (!existingData) return;
      
      const events: AuditEntry[] = JSON.parse(existingData);
      
      // Trouver l'entrée correspondante et la marquer comme synchronisée
      const updatedEvents = events.map(event => {
        if (event.timestamp === timestamp) {
          return { ...event, isSyncedToCloud: true };
        }
        return event;
      });
      
      // Sauvegarder
      await AsyncStorage.setItem(this.localAuditStorageKey, JSON.stringify(updatedEvents));
    } catch (error) {
      logger.warn('Erreur lors de la mise à jour du statut de synchronisation de l\'audit', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Synchronise les événements non synchronisés vers Firestore
   */
  async syncPendingEvents(): Promise<number> {
    if (!this.userId) {
      logger.warn('Tentative de synchronisation d\'audit sans ID utilisateur');
      return 0;
    }
    
    try {
      // Récupérer les événements existants
      const existingData = await AsyncStorage.getItem(this.localAuditStorageKey);
      if (!existingData) return 0;
      
      const events: AuditEntry[] = JSON.parse(existingData);
      
      // Filtrer les événements non synchronisés
      const unsyncedEvents = events.filter(event => !event.isSyncedToCloud);
      if (unsyncedEvents.length === 0) return 0;
      
      // Synchroniser chaque événement
      let syncedCount = 0;
      for (const event of unsyncedEvents) {
        try {
          await this.sendToCloud(event);
          syncedCount++;
        } catch (error) {
          logger.error('Erreur lors de la synchronisation d\'un événement d\'audit', {
            error: error instanceof Error ? error.message : String(error),
            eventType: event.eventType,
            timestamp: event.timestamp
          });
        }
      }
      
      logger.info(`${syncedCount}/${unsyncedEvents.length} événements d'audit synchronisés`);
      return syncedCount;
    } catch (error) {
      logger.error('Erreur lors de la synchronisation des événements d\'audit', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }
  
  /**
   * Récupère les événements d'audit locaux
   */
  async getLocalEvents(limit = 100): Promise<AuditEntry[]> {
    try {
      const existingData = await AsyncStorage.getItem(this.localAuditStorageKey);
      if (!existingData) return [];
      
      const events: AuditEntry[] = JSON.parse(existingData);
      
      // Trier par date décroissante et limiter
      return events
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      logger.error('Erreur lors de la récupération des événements d\'audit locaux', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
  
  /**
   * Nettoie les anciens événements d'audit locaux
   */
  async cleanupOldEvents(maxAgeDays = 30): Promise<number> {
    try {
      const existingData = await AsyncStorage.getItem(this.localAuditStorageKey);
      if (!existingData) return 0;
      
      const events: AuditEntry[] = JSON.parse(existingData);
      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
      
      // Filtrer les événements plus récents que la date limite
      const recentEvents = events.filter(event => event.timestamp > cutoffTime);
      
      // Calculer le nombre d'événements supprimés
      const removedCount = events.length - recentEvents.length;
      
      // Si des événements ont été supprimés, mettre à jour le stockage
      if (removedCount > 0) {
        await AsyncStorage.setItem(this.localAuditStorageKey, JSON.stringify(recentEvents));
        logger.info(`${removedCount} anciens événements d'audit nettoyés`);
      }
      
      return removedCount;
    } catch (error) {
      logger.error('Erreur lors du nettoyage des anciens événements d\'audit', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }
  
  /**
   * Log un événement d'authentification utilisateur
   */
  async logUserAuth(action: 'login' | 'logout' | 'register', metadata: Record<string, any> = {}): Promise<void> {
    const eventType = action === 'login' 
      ? AuditEventType.USER_LOGIN 
      : action === 'logout'
        ? AuditEventType.USER_LOGOUT
        : AuditEventType.USER_REGISTER;
        
    await this.logEvent(eventType, metadata);
  }
  
  /**
   * Log un événement de modification de données
   */
  async logDataChange(
    action: 'create' | 'update' | 'delete', 
    dataType: string,
    itemId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const eventType = action === 'create' 
      ? AuditEventType.DATA_CREATE 
      : action === 'update'
        ? AuditEventType.DATA_UPDATE
        : AuditEventType.DATA_DELETE;
        
    await this.logEvent(eventType, {
      dataType,
      itemId,
      ...metadata
    });
  }
  
  /**
   * Log un événement de synchronisation
   */
  async logSync(
    action: 'start' | 'complete' | 'error' | 'skipped', 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const eventType = action === 'start' 
      ? AuditEventType.SYNC_START 
      : action === 'complete'
        ? AuditEventType.SYNC_COMPLETE
        : action === 'error'
          ? AuditEventType.SYNC_ERROR
          : AuditEventType.SYNC_SKIPPED;
          
    await this.logEvent(eventType, metadata);
  }
  
  /**
   * Log un changement de paramètres système
   */
  async logSettingsChange(
    settingName: string,
    oldValue: any,
    newValue: any,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // Pour la confidentialité, éviter de stocker certaines valeurs sensibles
    const sanitizedOldValue = this.sanitizeSettingValue(settingName, oldValue);
    const sanitizedNewValue = this.sanitizeSettingValue(settingName, newValue);
    
    await this.logEvent(AuditEventType.SYSTEM_SETTINGS_CHANGE, {
      settingName,
      oldValue: sanitizedOldValue,
      newValue: sanitizedNewValue,
      ...metadata
    });
  }
  
  /**
   * Supprime les valeurs sensibles des paramètres
   */
  private sanitizeSettingValue(settingName: string, value: any): any {
    // Liste des paramètres sensibles
    const sensitiveSettings = ['password', 'token', 'apiKey', 'secret', 'credentials'];
    
    // Vérifier si le paramètre est sensible
    const isSensitive = sensitiveSettings.some(s => 
      settingName.toLowerCase().includes(s.toLowerCase())
    );
    
    if (isSensitive) {
      return '[REDACTED]';
    }
    
    return value;
  }
}

// Export d'une instance singleton
export const auditTrail = new AuditTrail();

export default auditTrail;
