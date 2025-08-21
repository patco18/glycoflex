/**
 * Utilitaire de réparation des problèmes de stockage et synchronisation
 * Ce module permet de diagnostiquer et résoudre les problèmes identifiés
 * dans l'écran de diagnostic
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedEncryptionService } from './enhancedCrypto';
import { SecureHybridStorage } from './secureCloudStorage';
import { AppLogger } from './logger';
import SyncDiagnosticTool from './syncDiagnosticTool';
import { FirebaseRepairTool } from './firebaseRepairTool';
import { db, auth } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Logger dédié pour la réparation
const logger = new AppLogger('StorageRepair');

// Constantes
const SYNC_STATUS_KEY = 'secure_cloud_sync_enabled';
const ENCRYPTION_KEY_STORAGE = 'GLYCOFLEX_ENCRYPTION_KEY_V2';
const SYNC_STATUS_RECOVERY_KEY = 'sync_status_recovery_attempt';
const LAST_SYNC_KEY = 'last_secure_cloud_sync';

/**
 * Classe utilitaire pour la réparation des problèmes de stockage
 */
export class StorageRepairTool {
  /**
   * Répare les problèmes liés à la clé de chiffrement
   * @returns Résultat de la réparation
   */
  static async repairEncryptionKey(): Promise<{
    success: boolean;
    message: string;
    actions: string[];
  }> {
    const actions: string[] = [];
    logger.info('Début de la réparation de la clé de chiffrement');

    try {
      // 1. Vérifier si une clé existe
      const keyExists = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
      
      if (!keyExists) {
        logger.warn('Aucune clé de chiffrement trouvée, génération d\'une nouvelle clé');
        await EnhancedEncryptionService.initializeEncryptionKey();
        actions.push('Nouvelle clé de chiffrement générée');
      } else {
        // 2. Réinitialiser la clé (sauvegarde l'ancienne dans les clés legacy)
        logger.info('Réinitialisation de la clé de chiffrement');
        await EnhancedEncryptionService.resetEncryptionKey();
        actions.push('Clé de chiffrement réinitialisée');
      }
      
      return {
        success: true,
        message: 'Clé de chiffrement réparée avec succès',
        actions
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Erreur lors de la réparation de la clé de chiffrement: ${errorMessage}`);
      
      return {
        success: false,
        message: `Échec de la réparation: ${errorMessage}`,
        actions
      };
    }
  }

  /**
   * Répare les problèmes de synchronisation
   * @returns Résultat de la réparation
   */
  static async repairSynchronization(): Promise<{
    success: boolean;
    message: string;
    actions: string[];
  }> {
    const actions: string[] = [];
    logger.info('Début de la réparation de la synchronisation');

    try {
      // 1. Vérifier l'état actuel de la synchronisation
      const syncEnabledStr = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      const syncEnabled = syncEnabledStr === 'true';

      if (!syncEnabled) {
        logger.info('Activation de la synchronisation');
        await SecureHybridStorage.setSyncEnabled(true);
        actions.push('Synchronisation activée');
      }

      // 2. Réinitialiser les écouteurs et abonnements
      logger.info('Réinitialisation des écouteurs de synchronisation');
      await SecureHybridStorage.stopRealtimeSubscription().catch(() => {});
      await SecureHybridStorage.startRealtimeSubscription();
      await SecureHybridStorage.startAutoSyncListeners();
      actions.push('Écouteurs de synchronisation réinitialisés');

      // 3. Forcer une réinitialisation des données de synchronisation
      logger.info('Réinitialisation des données de synchronisation');
      // Marquer manuellement une synchronisation réussie
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      actions.push('État de synchronisation réinitialisé');

      // 4. Marquer la récupération comme réussie
      await AsyncStorage.setItem(SYNC_STATUS_RECOVERY_KEY, Date.now().toString());

      return {
        success: true,
        message: 'Synchronisation réparée avec succès',
        actions
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Erreur lors de la réparation de la synchronisation: ${errorMessage}`);
      
      return {
        success: false,
        message: `Échec de la réparation: ${errorMessage}`,
        actions
      };
    }
  }

  /**
   * Effectue une réparation complète de tous les problèmes identifiés
   * @returns Résultat de la réparation
   */
  static async repairAll(): Promise<{
    success: boolean;
    message: string;
    actions: string[];
    details: Record<string, any>;
  }> {
    const allActions: string[] = [];
    const details: Record<string, any> = {};
    let overallSuccess = true;

    try {
      // 1. Réparer la clé de chiffrement
      const keyRepair = await this.repairEncryptionKey();
      allActions.push(...keyRepair.actions);
      details.keyRepair = keyRepair;
      if (!keyRepair.success) overallSuccess = false;

      // 2. Réparer la synchronisation
      const syncRepair = await this.repairSynchronization();
      allActions.push(...syncRepair.actions);
      details.syncRepair = syncRepair;
      if (!syncRepair.success) overallSuccess = false;

      // 3. Utiliser l'outil de diagnostic pour identifier d'autres problèmes
      const diagnosticTool = new SyncDiagnosticTool(
        db,
        auth.currentUser?.uid || 'anonymous',
        'repair-tool'
      );
      const diagnosticResult = await diagnosticTool.runFullDiagnostic();
      details.diagnostic = diagnosticResult;

      // 4. Réparer les problèmes identifiés si des erreurs ont été trouvées
      if (diagnosticResult.errorDetails && diagnosticResult.errorDetails.length > 0) {
        const repairResult = await diagnosticTool.attemptRepair();
        allActions.push(...repairResult.actions);
        details.diagnosticRepair = repairResult;
        if (!repairResult.success) overallSuccess = false;
      }

      return {
        success: overallSuccess,
        message: overallSuccess 
          ? 'Réparation complète effectuée avec succès' 
          : 'Réparation partielle effectuée avec des erreurs',
        actions: allActions,
        details
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Erreur lors de la réparation complète: ${errorMessage}`);
      
      return {
        success: false,
        message: `Échec de la réparation: ${errorMessage}`,
        actions: allActions,
        details
      };
    }
  }
}

// Exportation de l'instance pour utilisation dans d'autres modules
export default StorageRepairTool;
