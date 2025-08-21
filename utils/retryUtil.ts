/**
 * Utilitaires pour les opérations avec réessai
 * Implément un backoff exponentiel et des stratégies de réessai
 * pour les opérations réseau ou susceptibles d'échouer
 */
import { AppLogger } from './logger';

const logger = new AppLogger('RetryUtil');

/**
 * Options pour les opérations avec réessai
 */
export interface RetryOptions {
  maxRetries: number;       // Nombre maximum de tentatives
  initialDelay: number;     // Délai initial en ms
  maxDelay: number;         // Délai maximum en ms
  factor: number;           // Facteur de multiplication pour le backoff
  jitter: boolean;          // Ajouter une variation aléatoire au délai
  retryableErrors?: string[]; // Liste des messages d'erreur réessayables
}

/**
 * Résultat d'une opération avec réessai
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  lastDelay: number;
}

/**
 * Configuration par défaut
 */
const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 seconde
  maxDelay: 30000,    // 30 secondes
  factor: 2,          // Doubler le délai à chaque tentative
  jitter: true,       // Ajouter une variation aléatoire
};

/**
 * Exécute une opération avec réessai automatique et backoff exponentiel
 * 
 * @param operation Fonction à exécuter avec réessai
 * @param options Options de réessai
 * @returns Résultat de l'opération ou erreur après épuisement des tentatives
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  // Initialiser lastError avec une valeur par défaut
  let lastError = new Error('Opération échouée sans détails supplémentaires');
  let attempts = 0;
  let delay = opts.initialDelay;

  while (attempts < opts.maxRetries) {
    try {
      // Tentative d'exécution de l'opération
      const result = await operation();
      
      // Si on arrive ici, l'opération a réussi
      if (attempts > 0) {
        logger.info(`Opération réussie après ${attempts + 1} tentatives`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      attempts++;
      
      // Vérifier si l'erreur est réessayable
      if (opts.retryableErrors && opts.retryableErrors.length > 0) {
        const errorMessage = lastError.message || '';
        const isRetryable = opts.retryableErrors.some(msg => errorMessage.includes(msg));
        
        if (!isRetryable) {
          logger.warn(`Erreur non réessayable: ${errorMessage}`);
          break;
        }
      }
      
      // Si on a atteint le nombre maximal de tentatives, abandonner
      if (attempts >= opts.maxRetries) {
        logger.error(`Échec après ${attempts} tentatives`, lastError);
        break;
      }
      
      // Calculer le délai pour le prochain essai
      delay = Math.min(opts.maxDelay, delay * opts.factor);
      
      // Ajouter une variation aléatoire au délai (jitter)
      if (opts.jitter) {
        const jitterFactor = 0.5 + Math.random();
        delay = Math.floor(delay * jitterFactor);
      }
      
      logger.warn(`Tentative ${attempts}/${opts.maxRetries} échouée, nouvel essai dans ${delay}ms`, { 
        error: lastError.message 
      });
      
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Si on arrive ici, toutes les tentatives ont échoué
  throw lastError;
}

/**
 * Version asynchrone qui retourne un résultat au lieu de lancer une exception
 */
export async function executeWithRetryAsync<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  try {
    const result = await executeWithRetry(operation, options);
    return {
      success: true,
      result,
      attempts: 1, // Au moins une tentative
      lastDelay: 0
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      attempts: options.maxRetries || defaultRetryOptions.maxRetries,
      lastDelay: options.maxDelay || defaultRetryOptions.maxDelay
    };
  }
}

export default {
  executeWithRetry,
  executeWithRetryAsync
};
