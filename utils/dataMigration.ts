/**
 * Utilitaire de migration des données pour GlycoFlex
 * Permet de mettre à jour progressivement les données existantes
 * lorsque le schéma évolue
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppLogger } from './logger';
import { DataValidator } from './dataValidator';
import { executeWithRetry } from './retryUtil';
import errorHandler, { ErrorType, ErrorSeverity } from './errorHandler';
import auditTrail, { AuditEventType } from './auditTrail';

// Logger dédié pour les migrations
const logger = new AppLogger('DataMigration');

/**
 * État de migration
 */
interface MigrationState {
  lastCompletedVersion: string;
  inProgress: boolean;
  migrations: {
    [version: string]: {
      completed: boolean;
      startedAt: number | null;
      completedAt: number | null;
      error: string | null;
    }
  };
}

/**
 * Fonction de migration
 */
type MigrationFunction = () => Promise<void>;

/**
 * Définition d'une migration
 */
interface MigrationDefinition {
  version: string;
  description: string;
  migrateUp: MigrationFunction;
  migrateDown?: MigrationFunction;
  isRequired: boolean;
}

/**
 * Résultat d'une migration
 */
interface MigrationResult {
  success: boolean;
  version: string;
  error?: string;
  duration: number;
}

/**
 * Gestionnaire de migrations
 */
export class DataMigration {
  private migrations: MigrationDefinition[] = [];
  private userId: string | null = null;
  private stateKey = 'glycoflex_migration_state';
  
  /**
   * Initialise le gestionnaire de migrations
   */
  initialize(userId: string | null) {
    this.userId = userId;
    if (userId) {
      this.stateKey = `glycoflex_migration_state_${userId}`;
    }
    
    logger.info('Gestionnaire de migrations initialisé', { userId });
  }
  
  /**
   * Ajoute une migration
   */
  registerMigration(migration: MigrationDefinition): void {
    // Vérifier si cette version existe déjà
    const existingIndex = this.migrations.findIndex(m => m.version === migration.version);
    
    if (existingIndex >= 0) {
      logger.warn(`Migration pour la version ${migration.version} déjà enregistrée, sera remplacée`);
      this.migrations[existingIndex] = migration;
    } else {
      this.migrations.push(migration);
      
      // Trier les migrations par version
      this.migrations.sort((a, b) => {
        const vA = this.parseVersion(a.version);
        const vB = this.parseVersion(b.version);
        
        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
          const numA = vA[i] || 0;
          const numB = vB[i] || 0;
          if (numA !== numB) {
            return numA - numB;
          }
        }
        
        return 0;
      });
    }
    
    logger.debug(`Migration pour la version ${migration.version} enregistrée`, {
      description: migration.description,
      isRequired: migration.isRequired
    });
  }
  
  /**
   * Convertit une version en tableau de nombres pour comparaison
   */
  private parseVersion(version: string): number[] {
    return version.split('.').map(part => parseInt(part, 10) || 0);
  }
  
  /**
   * Compare deux versions
   * @returns Négatif si v1 < v2, positif si v1 > v2, 0 si égales
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = this.parseVersion(v1);
    const parts2 = this.parseVersion(v2);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 !== part2) {
        return part1 - part2;
      }
    }
    
    return 0;
  }
  
  /**
   * Récupère l'état des migrations
   */
  private async getMigrationState(): Promise<MigrationState> {
    try {
      const data = await AsyncStorage.getItem(this.stateKey);
      
      if (data) {
        return JSON.parse(data) as MigrationState;
      }
    } catch (error) {
      logger.warn('Impossible de lire l\'état des migrations', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // État par défaut
    return {
      lastCompletedVersion: '0.0.0',
      inProgress: false,
      migrations: {}
    };
  }
  
  /**
   * Enregistre l'état des migrations
   */
  private async saveMigrationState(state: MigrationState): Promise<void> {
    try {
      await AsyncStorage.setItem(this.stateKey, JSON.stringify(state));
    } catch (error) {
      logger.error('Impossible de sauvegarder l\'état des migrations', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Vérifie si des migrations sont nécessaires
   */
  async checkMigrations(targetVersion: string): Promise<{ required: boolean; migrations: string[] }> {
    if (!this.userId) {
      return { required: false, migrations: [] };
    }
    
    const state = await this.getMigrationState();
    const requiredMigrations: string[] = [];
    
    for (const migration of this.migrations) {
      // Ne considérer que les migrations jusqu'à la version cible
      if (this.compareVersions(migration.version, targetVersion) > 0) {
        continue;
      }
      
      // Vérifier si la migration a déjà été appliquée
      const isCompleted = this.compareVersions(migration.version, state.lastCompletedVersion) <= 0;
      
      if (!isCompleted && (migration.isRequired || requiredMigrations.length > 0)) {
        requiredMigrations.push(migration.version);
      }
    }
    
    return { 
      required: requiredMigrations.length > 0,
      migrations: requiredMigrations
    };
  }
  
  /**
   * Exécute les migrations jusqu'à une version cible
   */
  async runMigrations(targetVersion: string): Promise<MigrationResult[]> {
    if (!this.userId) {
      logger.warn('Tentative d\'exécution des migrations sans utilisateur authentifié');
      return [];
    }
    
    let state = await this.getMigrationState();
    
    // Vérifier si une migration est déjà en cours
    if (state.inProgress) {
      logger.warn('Une migration est déjà en cours, réinitialisation de l\'état');
      state.inProgress = false;
      await this.saveMigrationState(state);
    }
    
    // Marquer comme en cours
    state.inProgress = true;
    await this.saveMigrationState(state);
    
    const results: MigrationResult[] = [];
    
    try {
      for (const migration of this.migrations) {
        // Ne considérer que les migrations jusqu'à la version cible
        if (this.compareVersions(migration.version, targetVersion) > 0) {
          continue;
        }
        
        // Vérifier si la migration a déjà été appliquée
        if (this.compareVersions(migration.version, state.lastCompletedVersion) <= 0) {
          continue;
        }
        
        logger.info(`Exécution de la migration vers la version ${migration.version}`, {
          description: migration.description,
          isRequired: migration.isRequired
        });
        
        // Initialiser l'état de cette migration
        if (!state.migrations[migration.version]) {
          state.migrations[migration.version] = {
            completed: false,
            startedAt: null,
            completedAt: null,
            error: null
          };
        }
        
        // Marquer le début de la migration
        state.migrations[migration.version].startedAt = Date.now();
        await this.saveMigrationState(state);
        
        // Exécuter la migration
        const startTime = Date.now();
        try {
          await migration.migrateUp();
          
          // Marquer la migration comme terminée
          state = await this.getMigrationState();
          state.migrations[migration.version].completed = true;
          state.migrations[migration.version].completedAt = Date.now();
          state.migrations[migration.version].error = null;
          state.lastCompletedVersion = migration.version;
          
          const duration = Date.now() - startTime;
          results.push({ 
            success: true, 
            version: migration.version,
            duration
          });
          
          logger.info(`Migration vers la version ${migration.version} terminée avec succès`, {
            duration
          });
          
          // Journal d'audit
          await auditTrail.logEvent(AuditEventType.SYSTEM_VERSION_UPDATE, {
            fromVersion: state.lastCompletedVersion,
            toVersion: migration.version,
            duration
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Marquer la migration comme échouée
          state = await this.getMigrationState();
          state.migrations[migration.version].error = errorMessage;
          
          const duration = Date.now() - startTime;
          results.push({ 
            success: false, 
            version: migration.version,
            error: errorMessage,
            duration
          });
          
          logger.error(`Échec de la migration vers la version ${migration.version}`, {
            error: errorMessage,
            duration
          });
          
          errorHandler.handleError(
            error instanceof Error ? error : new Error(errorMessage),
            ErrorType.DATA_INTEGRITY,
            ErrorSeverity.ERROR,
            {
              migrationVersion: migration.version,
              description: migration.description
            }
          );
          
          // Si la migration est requise, arrêter le processus
          if (migration.isRequired) {
            throw new Error(`Migration requise vers la version ${migration.version} a échoué: ${errorMessage}`);
          }
        } finally {
          await this.saveMigrationState(state);
        }
      }
      
      // Marquer le processus comme terminé
      state = await this.getMigrationState();
      state.inProgress = false;
      await this.saveMigrationState(state);
      
      return results;
    } catch (error) {
      // En cas d'erreur grave, marquer le processus comme terminé
      state = await this.getMigrationState();
      state.inProgress = false;
      await this.saveMigrationState(state);
      
      logger.error('Échec du processus de migration', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Crée une migration pour transformer la structure des documents
   */
  createStructureMigration(
    version: string,
    description: string,
    collection: string,
    transform: (doc: any) => any,
    validator?: DataValidator<any>
  ): MigrationDefinition {
    return {
      version,
      description,
      isRequired: true,
      migrateUp: async () => {
        if (!this.userId) {
          throw new Error('Utilisateur non authentifié');
        }
        
        const documents = await this.getDocumentsForUser(collection);
        logger.info(`Migration de structure: ${documents.length} documents trouvés dans ${collection}`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const docWithRef of documents) {
          try {
            const transformedData = transform(docWithRef.data);
            
            // Valider les données transformées si un validateur est fourni
            if (validator) {
              validator.validateOrThrow(transformedData);
            }
            
            // Mettre à jour le document
            await executeWithRetry(async () => {
              await updateDoc(docWithRef.ref, transformedData);
            });
            
            successCount++;
          } catch (error) {
            errorCount++;
            logger.error(`Erreur lors de la migration du document ${docWithRef.id}`, {
              error: error instanceof Error ? error.message : String(error),
              collection
            });
            
            // Si trop d'erreurs, arrêter la migration
            if (errorCount > 10) {
              throw new Error(`Trop d'erreurs lors de la migration de structure (${errorCount})`);
            }
          }
        }
        
        logger.info(`Migration de structure terminée: ${successCount} succès, ${errorCount} erreurs`);
      }
    };
  }
  
  /**
   * Récupère les documents d'un utilisateur dans une collection
   */
  private async getDocumentsForUser(collectionName: string) {
    if (!this.userId) {
      return [];
    }
    
    try {
      const q = query(
        collection(db, collectionName),
        where('userId', '==', this.userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        data: docSnapshot.data(),
        ref: docSnapshot.ref
      }));
    } catch (error) {
      logger.error(`Erreur lors de la récupération des documents de l'utilisateur dans ${collectionName}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Crée une migration pour ajouter un champ manquant
   */
  createAddFieldMigration(
    version: string,
    collectionName: string,
    fieldName: string,
    defaultValue: any
  ): MigrationDefinition {
    return {
      version,
      description: `Ajouter le champ ${fieldName} à la collection ${collectionName}`,
      isRequired: false,
      migrateUp: async () => {
        if (!this.userId) {
          throw new Error('Utilisateur non authentifié');
        }
        
        const documents = await this.getDocumentsForUser(collectionName);
        logger.info(`Migration pour ajouter un champ: ${documents.length} documents trouvés dans ${collectionName}`);
        
        let updateCount = 0;
        
        for (const docWithRef of documents) {
          // Vérifier si le champ est déjà présent
          if (docWithRef.data[fieldName] === undefined) {
            await executeWithRetry(async () => {
              await updateDoc(docWithRef.ref, { [fieldName]: defaultValue });
            });
            
            updateCount++;
          }
        }
        
        logger.info(`Migration pour ajouter un champ terminée: ${updateCount} documents mis à jour`);
      }
    };
  }
  
  /**
   * Crée une migration pour corriger les données corrompues
   */
  createCorruptedDataMigration(
    version: string,
    isDataCorrupted: (data: any) => boolean,
    fixCorruptedData: (data: any) => any
  ): MigrationDefinition {
    return {
      version,
      description: 'Corriger les données corrompues',
      isRequired: true,
      migrateUp: async () => {
        if (!this.userId) {
          throw new Error('Utilisateur non authentifié');
        }
        
        // Parcourir toutes les collections pertinentes
        const collections = ['encrypted_measurements', 'sync_metadata'];
        
        for (const collectionName of collections) {
          const documents = await this.getDocumentsForUser(collectionName);
          
          let corruptedCount = 0;
          let fixedCount = 0;
          
          for (const docWithRef of documents) {
            if (isDataCorrupted(docWithRef.data)) {
              corruptedCount++;
              
              try {
                const fixedData = fixCorruptedData(docWithRef.data);
                
                await executeWithRetry(async () => {
                  await updateDoc(docWithRef.ref, fixedData);
                });
                
                fixedCount++;
              } catch (error) {
                logger.error(`Échec de correction des données pour ${docWithRef.id}`, {
                  error: error instanceof Error ? error.message : String(error),
                  collection: collectionName
                });
              }
            }
          }
          
          logger.info(`Réparation des données dans ${collectionName}: ${corruptedCount} corrompus, ${fixedCount} réparés`);
        }
      }
    };
  }
}

// Export d'une instance singleton
export const dataMigration = new DataMigration();

export default dataMigration;
