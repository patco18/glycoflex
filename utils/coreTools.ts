/**
 * Intégration et initialisation de tous les outils améliorés
 * Ce fichier permet d'initialiser et configurer tous les utilitaires
 * d'amélioration de la fiabilité et des performances
 */
import { AppLogger } from './logger';
import { LogLevel } from './loggerTypes';
import errorHandler, { ErrorType, ErrorSeverity } from './errorHandler';
import auditTrail, { AuditEventType } from './auditTrail';
import dataMigration from './dataMigration';
import SyncDiagnosticTool from './syncDiagnosticTool';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { auth } from '@/utils/internalAuth';

// Logger principal pour ce module
const logger = new AppLogger('CoreTools');

/**
 * Configuration pour l'initialisation des outils
 */
interface CoreToolsConfig {
  // Niveaux de log
  logLevels: {
    default: LogLevel;
    production: LogLevel;
    syncModule: LogLevel;
    storageModule: LogLevel;
  };
  
  // Activation des fonctionnalités
  enableAuditTrail: boolean;
  enableErrorReporting: boolean;
  enableDiagnostics: boolean;
  enableAutomaticMigrations: boolean;
  
  // Configuration des migrations
  targetAppVersion: string;
}

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: CoreToolsConfig = {
  logLevels: {
    default: 'info',
    production: 'warn',
    syncModule: 'info',
    storageModule: 'info'
  },
  enableAuditTrail: true,
  enableErrorReporting: true,
  enableDiagnostics: true,
  enableAutomaticMigrations: true,
  targetAppVersion: Constants.expoConfig?.version || '1.0.0'
};

/**
 * Résultat de l'initialisation
 */
interface InitializationResult {
  success: boolean;
  userId: string | null;
  deviceId: string;
  migrationsRequired: boolean;
  diagnosticResults: any | null;
  error?: string;
}

/**
 * Information sur l'appareil
 */
interface DeviceInfo {
  id: string;
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  osName: string;
  osVersion: string;
  appVersion: string;
  isEmulator: boolean;
}

/**
 * Gestionnaire central des outils améliorés
 */
export class CoreTools {
  private isInitialized = false;
  private userId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private config: CoreToolsConfig;
  
  constructor(config: Partial<CoreToolsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialise tous les outils améliorés
   */
  async initialize(): Promise<InitializationResult> {
    if (this.isInitialized) {
      logger.warn('CoreTools déjà initialisé, réinitialisation');
    }
    
    try {
      logger.info('Initialisation des outils centraux');
      
      // Configurer les niveaux de log
      this.configureLogLevels();
      
      // Récupérer les informations sur l'appareil
      this.deviceInfo = await this.getDeviceInfo();
      
      // Récupérer l'utilisateur connecté
      this.userId = auth.currentUser?.uid || null;
      
      // Initialiser la gestion des erreurs
      if (this.config.enableErrorReporting) {
        errorHandler.initialize(this.userId, this.deviceInfo);
        logger.info('Gestionnaire d\'erreurs initialisé');
      }
      
      // Initialiser l'audit trail
      if (this.config.enableAuditTrail) {
        auditTrail.initialize(
          this.userId,
          this.deviceInfo.id,
          this.deviceInfo.appVersion
        );
        logger.info('Système d\'audit initialisé');
        
        // Enregistrer l'événement d'initialisation
        await auditTrail.logEvent(AuditEventType.SYSTEM_VERSION_UPDATE, {
          appVersion: this.deviceInfo.appVersion,
          deviceInfo: {
            osName: this.deviceInfo.osName,
            osVersion: this.deviceInfo.osVersion
          }
        });
      }
      
      // Initialiser les migrations
      let migrationsRequired = false;
      if (this.config.enableAutomaticMigrations && this.userId) {
        dataMigration.initialize(this.userId);
        logger.info('Système de migration initialisé');
        
        const migrationCheck = await dataMigration.checkMigrations(
          this.config.targetAppVersion
        );
        migrationsRequired = migrationCheck.required;
        
        if (migrationsRequired) {
          logger.info(`Migrations requises: ${migrationCheck.migrations.join(', ')}`);
          
          // Si des migrations sont requises, les exécuter automatiquement
          if (this.config.enableAutomaticMigrations) {
            await this.runMigrations();
          }
        }
      }
      
      // Exécuter un diagnostic si activé
      let diagnosticResults = null;
      if (this.config.enableDiagnostics && this.userId) {
        diagnosticResults = await this.runDiagnostic();
      }
      
      this.isInitialized = true;
      
      logger.info('Initialisation des outils centraux terminée avec succès');
      
      return {
        success: true,
        userId: this.userId,
        deviceId: this.deviceInfo.id,
        migrationsRequired,
        diagnosticResults
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Échec de l'initialisation des outils centraux: ${errorMessage}`, {
        error: errorMessage
      });
      
      // Journaliser l'erreur avec le gestionnaire d'erreurs s'il a été initialisé
      if (errorHandler) {
        errorHandler.handleError(
          error instanceof Error ? error : new Error(errorMessage),
          ErrorType.UNEXPECTED,
          ErrorSeverity.ERROR,
          { context: 'CoreTools initialization' }
        );
      }
      
      return {
        success: false,
        userId: this.userId,
        deviceId: this.deviceInfo?.id || 'unknown',
        migrationsRequired: false,
        diagnosticResults: null,
        error: errorMessage
      };
    }
  }
  
  /**
   * Configure les niveaux de log en fonction de l'environnement
   */
  private configureLogLevels(): void {
    const isProduction = !__DEV__;
    
    // Configurer le niveau global par défaut
    AppLogger.setDefaultLevel(
      isProduction 
        ? this.config.logLevels.production
        : this.config.logLevels.default
    );
    
    // Configurer des niveaux spécifiques pour certains modules
    AppLogger.setModuleLevel('SyncService', this.config.logLevels.syncModule);
    AppLogger.setModuleLevel('Storage', this.config.logLevels.storageModule);
  }
  
  /**
   * Récupère les informations sur l'appareil
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    // Générer un ID d'appareil unique ou le récupérer
    let deviceId: string;
    
    try {
      if (Platform.OS === 'ios') {
        deviceId = await Application.getIosIdForVendorAsync() || `ios_${Date.now()}`;
      } else if (Platform.OS === 'android') {
        // Utiliser la fonction disponible en fonction de la version d'Expo
        try {
          if (Platform.OS === 'android') {
            if (typeof Application.getAndroidId === 'function') {
              deviceId = Application.getAndroidId() || `android_${Date.now()}`;
            } else {
              deviceId = `android_${Date.now()}`;
            }
          } else {
            // Pour iOS, utiliser une alternative disponible
            deviceId = Constants.installationId || `ios_${Date.now()}`;
          }
        } catch (error) {
          deviceId = `device_${Date.now()}`;
          logger.warn('Error getting device ID', { error });
        }
      } else {
        deviceId = `unknown_${Date.now()}`;
      }
    } catch (error) {
      deviceId = `fallback_${Date.now()}`;
      logger.warn('Impossible de récupérer l\'ID unique de l\'appareil', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return {
      id: deviceId,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: Constants.expoConfig?.version || '1.0.0',
      isEmulator: Device.isDevice === false
    };
  }
  
  /**
   * Exécute les migrations requises
   */
  async runMigrations(): Promise<any[]> {
    if (!this.userId) {
      logger.warn('Tentative d\'exécution des migrations sans utilisateur authentifié');
      return [];
    }
    
    logger.info('Exécution des migrations...');
    
    try {
      const results = await dataMigration.runMigrations(this.config.targetAppVersion);
      
      logger.info(`${results.length} migrations exécutées`, {
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Échec de l'exécution des migrations: ${errorMessage}`, {
        error: errorMessage
      });
      
      errorHandler.handleError(
        error instanceof Error ? error : new Error(errorMessage),
        ErrorType.DATA_INTEGRITY,
        ErrorSeverity.ERROR,
        { context: 'Data migration' }
      );
      
      return [];
    }
  }
  
  /**
   * Exécute un diagnostic complet
   */
  async runDiagnostic(): Promise<any> {
    if (!this.userId || !this.deviceInfo) {
      logger.warn('Tentative d\'exécution du diagnostic sans utilisateur authentifié');
      return null;
    }
    
    logger.info('Exécution du diagnostic...');
    
    try {
      const firestore = getFirestore();
      const diagnosticTool = new SyncDiagnosticTool(
        firestore,
        this.userId,
        this.deviceInfo.id
      );
      
      const results = await diagnosticTool.runFullDiagnostic();
      
      logger.info('Diagnostic terminé', {
        syncHealthScore: results.stats.syncHealthScore,
        errorCount: results.errorDetails.length
      });
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Échec de l'exécution du diagnostic: ${errorMessage}`, {
        error: errorMessage
      });
      
      errorHandler.handleError(
        error instanceof Error ? error : new Error(errorMessage),
        ErrorType.UNEXPECTED,
        ErrorSeverity.WARNING,
        { context: 'Sync diagnostic' }
      );
      
      return null;
    }
  }
  
  /**
   * Enregistre une session utilisateur
   */
  async logUserSession(isLogin = true): Promise<void> {
    if (!this.isInitialized || !this.config.enableAuditTrail) {
      return;
    }
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user && isLogin) {
      logger.warn('Tentative d\'enregistrement de session sans utilisateur authentifié');
      return;
    }
    
    // Mettre à jour l'utilisateur actuel
    this.userId = user?.uid || null;
    
    if (this.userId && this.deviceInfo) {
      try {
        await auditTrail.logUserAuth(
          isLogin ? 'login' : 'logout',
          {
            email: user?.email || 'unknown',
            deviceInfo: {
              brand: this.deviceInfo.brand,
              model: this.deviceInfo.modelName,
              osName: this.deviceInfo.osName,
              osVersion: this.deviceInfo.osVersion
            }
          }
        );
        
        logger.info(`Utilisateur ${isLogin ? 'connecté' : 'déconnecté'}`);
      } catch (error) {
        logger.warn(`Échec de l'enregistrement de la session utilisateur`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  
  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    logger.info('Nettoyage des ressources...');
    
    try {
      // Synchroniser les événements d'audit en attente
      if (this.config.enableAuditTrail) {
        const syncedCount = await auditTrail.syncPendingEvents();
        logger.debug(`${syncedCount} événements d'audit synchronisés`);
        
        // Nettoyer les anciens événements
        const cleanedCount = await auditTrail.cleanupOldEvents();
        logger.debug(`${cleanedCount} anciens événements d'audit nettoyés`);
      }
      
      this.isInitialized = false;
      logger.info('Nettoyage terminé');
    } catch (error) {
      logger.error('Erreur lors du nettoyage des ressources', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Vérifie si les outils sont initialisés
   */
  get isReady(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Récupère l'ID de l'utilisateur actuel
   */
  get currentUserId(): string | null {
    return this.userId;
  }
  
  /**
   * Récupère les informations sur l'appareil
   */
  get currentDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }
}

// Export d'une instance singleton
export const coreTools = new CoreTools();

export default coreTools;
