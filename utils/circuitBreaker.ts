/**
 * Circuit Breaker adaptatif pour prévenir les cascades d'erreurs
 * et permettre une reprise progressive des opérations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLogger } from './logger';

const logger = new AppLogger('CircuitBreaker');

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  threshold: number;          // Nombre d'erreurs avant ouverture
  resetTimeoutMs: number;     // Délai avant passage en HALF_OPEN (ms)
  successThreshold: number;   // Nombre de succès pour fermer le circuit
  storageKeyPrefix: string;   // Préfixe pour la clé de stockage
  maxErrorAge: number;        // Âge maximal d'une erreur en ms
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  errors: Array<{
    time: number;
    message: string;
  }>;
}

/**
 * Implémentation d'un circuit breaker adaptatif avec persistance
 */
export class AdaptiveCircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private storageKey: string;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * Crée une nouvelle instance de circuit breaker
   */
  constructor(
    id: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      threshold: 5,
      resetTimeoutMs: 60000, // 1 minute
      successThreshold: 2,
      storageKeyPrefix: 'circuitbreaker_',
      maxErrorAge: 86400000, // 24 heures
      ...config
    };
    
    this.storageKey = `${this.config.storageKeyPrefix}${id}`;
    
    // État initial
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      errors: []
    };
    
    // Charger l'état depuis le stockage
    this.loadState();
  }
  
  /**
   * Charge l'état du circuit breaker depuis AsyncStorage
   */
  private async loadState(): Promise<void> {
    try {
      const storedState = await AsyncStorage.getItem(this.storageKey);
      if (storedState) {
        this.state = JSON.parse(storedState);
        
        // Si le circuit était ouvert et que le délai est passé, passer en HALF_OPEN
        if (this.state.state === 'OPEN') {
          const elapsed = Date.now() - this.state.lastFailureTime;
          if (elapsed > this.config.resetTimeoutMs) {
            this.transitionToHalfOpen();
          } else {
            // Programmer la transition vers HALF_OPEN
            const remainingTime = this.config.resetTimeoutMs - elapsed;
            this.resetTimer = setTimeout(() => this.transitionToHalfOpen(), remainingTime);
          }
        }
        
        // Filtrer les erreurs trop anciennes
        this.state.errors = this.state.errors.filter(error => 
          (Date.now() - error.time) < this.config.maxErrorAge
        );
      }
      
      logger.debug(`Circuit breaker chargé: ${this.state.state}`);
    } catch (error) {
      logger.error('Erreur lors du chargement du circuit breaker', error);
    }
  }
  
  /**
   * Enregistre l'état du circuit breaker dans AsyncStorage
   */
  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement du circuit breaker', error);
    }
  }
  
  /**
   * Enregistre une défaillance dans le circuit
   */
  async recordFailure(error?: Error): Promise<boolean> {
    if (this.state.state === 'OPEN') {
      logger.debug('Circuit déjà ouvert, défaillance ignorée');
      return false;
    }
    
    // Incrémenter le compteur d'erreurs
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    this.state.successCount = 0;
    
    // Ajouter l'erreur à l'historique
    this.state.errors.push({
      time: Date.now(),
      message: error?.message || 'Unknown error'
    });
    
    // Limiter la taille de l'historique
    if (this.state.errors.length > 10) {
      this.state.errors = this.state.errors.slice(-10);
    }
    
    // Si le seuil est atteint, ouvrir le circuit
    if (this.state.failureCount >= this.config.threshold) {
      await this.transitionToOpen();
      return false;
    }
    
    // Sinon, enregistrer l'état
    await this.saveState();
    return true;
  }
  
  /**
   * Enregistre un succès dans le circuit
   */
  async recordSuccess(): Promise<void> {
    // Si le circuit est fermé, rien à faire
    if (this.state.state === 'CLOSED') {
      // Réinitialiser le compteur d'erreurs progressivement
      if (this.state.failureCount > 0) {
        this.state.failureCount = Math.max(0, this.state.failureCount - 0.5);
        await this.saveState();
      }
      return;
    }
    
    // Si le circuit est semi-ouvert
    if (this.state.state === 'HALF_OPEN') {
      this.state.successCount++;
      
      // Si assez de succès consécutifs, fermer le circuit
      if (this.state.successCount >= this.config.successThreshold) {
        await this.transitionToClosed();
      } else {
        await this.saveState();
      }
    }
  }
  
  /**
   * Transition vers l'état OPEN
   */
  private async transitionToOpen(): Promise<void> {
    logger.warn(`🚨 CIRCUIT BREAKER OUVERT! ${this.state.failureCount}/${this.config.threshold} erreurs détectées. Synchronisation suspendue.`);
    
    this.state.state = 'OPEN';
    this.state.successCount = 0;
    
    // Programmer la transition vers HALF_OPEN
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(
      () => this.transitionToHalfOpen(), 
      this.config.resetTimeoutMs
    );
    
    await this.saveState();
  }
  
  /**
   * Transition vers l'état HALF_OPEN
   */
  private async transitionToHalfOpen(): Promise<void> {
    logger.info('⚠️ Circuit breaker en mode semi-ouvert: test de reprise');
    
    this.state.state = 'HALF_OPEN';
    this.state.successCount = 0;
    this.state.failureCount = Math.floor(this.config.threshold / 2);
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    
    await this.saveState();
  }
  
  /**
   * Transition vers l'état CLOSED
   */
  private async transitionToClosed(): Promise<void> {
    logger.info('✅ Circuit breaker fermé: synchronisation normale rétablie');
    
    this.state.state = 'CLOSED';
    this.state.failureCount = 0;
    this.state.successCount = 0;
    
    await this.saveState();
  }
  
  /**
   * Réinitialise complètement le circuit breaker
   */
  async reset(): Promise<void> {
    logger.info('🔄 Circuit breaker réinitialisé manuellement');
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      errors: []
    };
    
    await this.saveState();
  }
  
  /**
   * Vérifie si l'opération peut être exécutée
   */
  canExecute(): boolean {
    return this.state.state !== 'OPEN';
  }
  
  /**
   * Récupère l'état actuel du circuit breaker
   */
  getState(): CircuitState {
    return this.state.state;
  }
  
  /**
   * Récupère les statistiques du circuit breaker
   */
  getStats() {
    return {
      state: this.state.state,
      failureCount: this.state.failureCount,
      successCount: this.state.successCount,
      lastFailureTime: this.state.lastFailureTime,
      errorCount: this.state.errors.length,
      recentErrors: this.state.errors.slice(-3) // 3 erreurs les plus récentes
    };
  }
}

export default AdaptiveCircuitBreaker;
