/**
 * Outil de diagnostic de synchronisation pour GlycoFlex
 * Permet d'analyser et de résoudre les problèmes de synchronisation
 */
import { AppLogger } from './logger';
import { DataValidator, validators } from './dataValidator';
import AdaptiveCircuitBreaker from './circuitBreaker';
import { executeWithRetryAsync, RetryOptions } from './retryUtil';
import { findCorruptedDocuments } from './dataRepair';
import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, where, Firestore } from 'firebase/firestore';

// Logger dédié pour le diagnostic
const logger = new AppLogger('SyncDiagnostic');

/**
 * Statistiques de synchronisation
 */
export interface SyncStats {
  totalDocuments: number;
  documentsPendingUpload: number;
  documentsPendingDownload: number;
  corruptedDocuments: number;
  lastSyncTimestamp: number | null;
  averageSyncDuration: number | null;
  syncErrors: number;
  consecutiveSuccessfulSyncs: number;
  syncHealthScore: number; // 0-100, 100 étant parfait
}

/**
 * Diagnostic de synchronisation individuel
 */
export interface SyncDiagnostic {
  diagnosticId: string;
  timestamp: number;
  userId: string;
  deviceId: string;
  stats: SyncStats;
  errorDetails: {
    code: string;
    message: string;
    location: string;
  }[];
  recommendations: string[];
}

/**
 * Schéma de validation pour les métadonnées de synchronisation
 */
interface SyncMetadata {
  deviceId: string;
  userId: string;
  lastSyncTimestamp: number;
  syncCount: number;
  failedSyncCount: number;
  documentCount: number;
  version: string;
}

/**
 * Validateur pour les métadonnées de synchronisation
 */
const syncMetadataValidator = new DataValidator<SyncMetadata>('SyncMetadata', {
  deviceId: validators.isValidId,
  userId: validators.isValidId,
  lastSyncTimestamp: validators.isValidTimestamp,
  syncCount: validators.isNumber,
  failedSyncCount: validators.isNumber,
  documentCount: validators.isNumber,
  version: validators.isNonEmptyString
});

/**
 * Classe de diagnostic de synchronisation
 */
export class SyncDiagnosticTool {
  private firestore: Firestore;
  private userId: string;
  private deviceId: string;
  private circuitBreaker: AdaptiveCircuitBreaker;
  
  /**
   * Crée un nouvel outil de diagnostic
   * @param firestore Instance Firestore
   * @param userId ID de l'utilisateur
   * @param deviceId ID du dispositif
   */
  constructor(firestore: Firestore, userId: string, deviceId: string) {
    this.firestore = firestore;
    this.userId = userId;
    this.deviceId = deviceId;
    
    // Circuit breaker adaptatif pour les appels Firestore
    this.circuitBreaker = new AdaptiveCircuitBreaker(
      `sync_${userId}_${deviceId}`,
      {
        threshold: 3,
        resetTimeoutMs: 30000,
        maxErrorAge: 5 * 60 * 1000 // 5 minutes
      }
    );
  }

  /**
   * Exécute un diagnostic complet
   * @returns Diagnostic de synchronisation
   */
  async runFullDiagnostic(): Promise<SyncDiagnostic> {
    logger.info('Démarrage d\'un diagnostic complet de synchronisation', { 
      userId: this.userId, 
      deviceId: this.deviceId 
    });
    
    const diagnosticId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();
    const errorDetails: { code: string; message: string; location: string }[] = [];
    const recommendations: string[] = [];
    
    // Statistiques initiales
    let stats: SyncStats = {
      totalDocuments: 0,
      documentsPendingUpload: 0,
      documentsPendingDownload: 0,
      corruptedDocuments: 0,
      lastSyncTimestamp: null,
      averageSyncDuration: null,
      syncErrors: 0,
      consecutiveSuccessfulSyncs: 0,
      syncHealthScore: 0 // Sera calculé à la fin
    };
    
    try {
      // Récupérer les métadonnées de synchronisation
      const syncMetadata = await this.getSyncMetadata();
      if (syncMetadata) {
        stats.lastSyncTimestamp = syncMetadata.lastSyncTimestamp;
        stats.syncErrors = syncMetadata.failedSyncCount;
        stats.consecutiveSuccessfulSyncs = this.calculateConsecutiveSuccesses(syncMetadata);
        stats.totalDocuments = syncMetadata.documentCount;
      } else {
        errorDetails.push({
          code: 'missing_metadata',
          message: 'Métadonnées de synchronisation non trouvées',
          location: 'sync_metadata collection'
        });
        recommendations.push('Initialiser les métadonnées de synchronisation');
      }
      
      // Vérifier les documents en attente
      const pendingStats = await this.checkPendingDocuments();
      stats.documentsPendingUpload = pendingStats.pendingUpload;
      stats.documentsPendingDownload = pendingStats.pendingDownload;
      
      // Vérifier les documents corrompus
      const corruptedDocs = await this.findCorruptedDocuments();
      stats.corruptedDocuments = corruptedDocs.length;
      
      if (corruptedDocs.length > 0) {
        errorDetails.push({
          code: 'corrupted_documents',
          message: `${corruptedDocs.length} documents corrompus détectés`,
          location: 'encrypted_measurements collection'
        });
        recommendations.push('Exécuter l\'utilitaire de réparation des documents');
      }
      
      // Vérifier l'état du circuit breaker
      const cbStatus = this.checkCircuitBreakerStatus();
      if (cbStatus.isOpen) {
        errorDetails.push({
          code: 'circuit_breaker_open',
          message: `Circuit breaker ouvert depuis ${cbStatus.openDuration}ms`,
          location: 'cloud_sync module'
        });
        recommendations.push('Attendre la fermeture automatique du circuit breaker ou le réinitialiser manuellement');
      }
      
      // Calculer le score de santé de la synchronisation
      stats.syncHealthScore = this.calculateSyncHealthScore(stats, errorDetails);
      
      // Ajouter des recommandations générales
      if (stats.syncHealthScore < 50) {
        recommendations.push('Effectuer une synchronisation complète après correction des erreurs');
      }
      
      if (stats.documentsPendingUpload > 20) {
        recommendations.push('Vérifier la connectivité réseau et synchroniser dès que possible');
      }
    } catch (error) {
      logger.error('Erreur lors du diagnostic de synchronisation', { 
        error: error instanceof Error ? error.message : String(error),
        userId: this.userId,
        deviceId: this.deviceId
      });
      
      errorDetails.push({
        code: 'diagnostic_error',
        message: error instanceof Error ? error.message : String(error),
        location: 'diagnostic_tool'
      });
      
      recommendations.push('Contactez le support technique avec les détails du diagnostic');
    }
    
    // Constituer le rapport de diagnostic
    const diagnostic: SyncDiagnostic = {
      diagnosticId,
      timestamp,
      userId: this.userId,
      deviceId: this.deviceId,
      stats,
      errorDetails,
      recommendations
    };
    
    logger.info('Diagnostic de synchronisation terminé', { 
      diagnosticId,
      syncHealthScore: stats.syncHealthScore,
      errorCount: errorDetails.length
    });
    
    return diagnostic;
  }
  
  /**
   * Récupère les métadonnées de synchronisation
   */
  private async getSyncMetadata(): Promise<SyncMetadata | null> {
    try {
      // Utiliser executeWithRetryAsync pour la résilience
      const result = await executeWithRetryAsync(async () => {
        const metadataRef = doc(this.firestore, 'sync_metadata', `${this.userId}_${this.deviceId}`);
        
        // Vérifier si on peut exécuter (circuit breaker)
        if (!this.circuitBreaker.canExecute()) {
          throw new Error('Circuit breaker ouvert, opération abandonnée');
        }
        
        try {
          const metadataSnap = await getDoc(metadataRef);
          
          if (!metadataSnap.exists()) {
            return null;
          }
          
          const data = metadataSnap.data() as unknown;
          
          // Valider les données avec le validateur
          try {
            const validData = syncMetadataValidator.validateOrThrow(data);
            await this.circuitBreaker.recordSuccess();
            return validData;
          } catch (error) {
            logger.warn('Métadonnées de synchronisation invalides', { 
              error: error instanceof Error ? error.message : String(error),
              data
            });
            return null;
          }
        } catch (error) {
          await this.circuitBreaker.recordFailure(error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }, {
        maxRetries: 3,
        initialDelay: 1000,
        factor: 1.5
      });
      
      return result.success && result.result !== undefined ? result.result : null;
    } catch (error) {
      logger.error('Erreur lors de la récupération des métadonnées de synchronisation', { 
        error: error instanceof Error ? error.message : String(error),
        userId: this.userId,
        deviceId: this.deviceId
      });
      return null;
    }
  }
  
  /**
   * Vérifie les documents en attente de synchronisation
   */
  private async checkPendingDocuments(): Promise<{ pendingUpload: number; pendingDownload: number }> {
    try {
      // Simuler la vérification des documents en attente d'envoi
      // Dans une implémentation réelle, cela vérifierait la file d'attente locale
      // et la comparaison avec le cloud
      const pendingUpload = 0;
      
      // Vérifier les documents distants non encore téléchargés
      let pendingDownload = 0;
      
      const result = await executeWithRetryAsync(async () => {
        if (!this.circuitBreaker.canExecute()) {
          throw new Error('Circuit breaker ouvert, opération abandonnée');
        }
        
        try {
          const syncInfoRef = doc(this.firestore, 'sync_metadata', `${this.userId}_${this.deviceId}`);
          const syncInfoDoc = await getDoc(syncInfoRef);
          
          if (syncInfoDoc.exists()) {
            const syncInfo = syncInfoDoc.data();
            const lastSyncTimestamp = syncInfo.lastSyncTimestamp || 0;
            
            // Rechercher les documents ajoutés depuis la dernière synchronisation
            const q = query(
              collection(this.firestore, 'encrypted_measurements'),
              where('userId', '==', this.userId),
              where('timestamp', '>', lastSyncTimestamp)
            );
            
            const querySnapshot = await getDocs(q);
            await this.circuitBreaker.recordSuccess();
            return querySnapshot.size;
          }
          
          await this.circuitBreaker.recordSuccess();
          return 0;
        } catch (error) {
          await this.circuitBreaker.recordFailure(error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }, {
        maxRetries: 2,
        initialDelay: 1000,
        factor: 1.5
      });
      
      if (result.success && result.result !== undefined) {
        pendingDownload = result.result;
      }
      
      return { pendingUpload, pendingDownload };
    } catch (error) {
      logger.error('Erreur lors de la vérification des documents en attente', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return { pendingUpload: 0, pendingDownload: 0 };
    }
  }
  
  /**
   * Trouve les documents corrompus dans Firestore
   */
  private async findCorruptedDocuments(): Promise<string[]> {
    try {
      // Utiliser l'utilitaire de recherche des documents corrompus
      const corruptedDocs = await findCorruptedDocuments(this.userId);
      return corruptedDocs.map(doc => doc.id);
    } catch (error) {
      logger.error('Erreur lors de la recherche des documents corrompus', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
  
  /**
   * Vérifie l'état du circuit breaker
   */
  private checkCircuitBreakerStatus(): { isOpen: boolean; openDuration: number } {
    const state = this.circuitBreaker.getState();
    const isOpen = state === 'OPEN';
    const stats = this.circuitBreaker.getStats();
    const openDuration = isOpen && stats.lastFailureTime > 0 
      ? Date.now() - stats.lastFailureTime 
      : 0;
    
    return { isOpen, openDuration };
  }
  
  /**
   * Calcule le nombre de synchronisations consécutives réussies
   */
  private calculateConsecutiveSuccesses(metadata: SyncMetadata): number {
    // Cette implémentation est simplifiée
    // Dans une implémentation réelle, on garderait un historique des synchronisations
    return Math.max(0, metadata.syncCount - metadata.failedSyncCount);
  }
  
  /**
   * Calcule un score de santé de la synchronisation (0-100)
   */
  private calculateSyncHealthScore(stats: SyncStats, errors: { code: string; message: string; location: string }[]): number {
    // Base score
    let score = 100;
    
    // Pénalité pour les documents corrompus (grave)
    score -= stats.corruptedDocuments * 15;
    
    // Pénalité pour les documents en attente (moins grave)
    score -= Math.min(25, stats.documentsPendingUpload * 0.5);
    score -= Math.min(10, stats.documentsPendingDownload * 0.2);
    
    // Pénalité pour les erreurs de synchronisation
    score -= Math.min(30, stats.syncErrors * 5);
    
    // Bonus pour les synchronisations consécutives réussies
    score += Math.min(10, stats.consecutiveSuccessfulSyncs);
    
    // Pénalité pour chaque erreur détectée
    score -= Math.min(30, errors.length * 10);
    
    // Limiter le score à l'intervalle 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Réinitialise le circuit breaker en cas de problème
   */
  resetCircuitBreaker(): void {
    logger.info('Réinitialisation du circuit breaker', { 
      previousState: this.circuitBreaker.getState() 
    });
    this.circuitBreaker.reset();
  }
  
  /**
   * Tente de réparer la synchronisation
   * @returns Résultat de la tentative de réparation
   */
  async attemptRepair(): Promise<{ success: boolean; actions: string[] }> {
    logger.info('Tentative de réparation de la synchronisation', { 
      userId: this.userId, 
      deviceId: this.deviceId 
    });
    
    const actions: string[] = [];
    let success = true;
    
    try {
      // 1. Réinitialiser le circuit breaker
      this.resetCircuitBreaker();
      actions.push('Circuit breaker réinitialisé');
      
      // 2. Trouver et traiter les documents corrompus
      const corruptedDocs = await this.findCorruptedDocuments();
      if (corruptedDocs.length > 0) {
        // Dans une implémentation réelle, on utiliserait 
        // dataRepair.repairCorruptedDocuments ici
        actions.push(`${corruptedDocs.length} documents corrompus identifiés pour réparation`);
      }
      
      // 3. Réinitialiser les métadonnées de synchronisation si nécessaire
      const syncMetadata = await this.getSyncMetadata();
      if (!syncMetadata) {
        // Créer de nouvelles métadonnées
        actions.push('Métadonnées de synchronisation manquantes - initialisation nécessaire');
        success = false;
      }
      
      logger.info('Tentative de réparation terminée', { success, actionCount: actions.length });
      return { success, actions };
    } catch (error) {
      logger.error('Échec de la tentative de réparation', { 
        error: error instanceof Error ? error.message : String(error)
      });
      
      actions.push(`Erreur lors de la réparation: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, actions };
    }
  }
}

export default SyncDiagnosticTool;
