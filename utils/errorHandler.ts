/**
 * Système de gestion des erreurs pour GlycoFlex
 * Fournit des utilitaires pour centraliser la gestion des erreurs
 * avec un traitement cohérent, des rapports et une surveillance
 */
import * as Sentry from '@sentry/react-native';
import { AppLogger } from './logger';

// Logger dédié pour la gestion des erreurs
const logger = new AppLogger('ErrorHandler');

/**
 * Types d'erreurs possibles dans l'application
 */
export enum ErrorType {
  // Erreurs système
  NETWORK = 'network',
  DATABASE = 'database',
  STORAGE = 'storage',
  AUTHENTICATION = 'authentication',
  SYNC = 'synchronization',
  PERMISSION = 'permission',
  
  // Erreurs fonctionnelles
  VALIDATION = 'validation',
  DATA_INTEGRITY = 'data_integrity',
  CALCULATION = 'calculation',
  EXPORT = 'export',
  
  // Erreurs génériques
  UNEXPECTED = 'unexpected',
  USER_ACTION = 'user_action',
  TIMEOUT = 'timeout',
  ENCRYPTION = 'encryption'
}

/**
 * Niveau de gravité d'une erreur
 */
export enum ErrorSeverity {
  FATAL = 'fatal',    // Crash ou erreur irrécupérable
  ERROR = 'error',    // Erreur grave nécessitant une attention
  WARNING = 'warning', // Problème potentiel, mais non bloquant
  INFO = 'info'       // Information sur un problème mineur
}

/**
 * Options de gestion d'erreur
 */
export interface ErrorHandlingOptions {
  isSilent?: boolean;        // Ne pas montrer à l'utilisateur
  reportToSentry?: boolean;  // Envoyer à Sentry
  logLevel?: 'debug' | 'info' | 'warn' | 'error';  // Niveau de log
  userContext?: Record<string, any>;  // Contexte utilisateur additionnel
  tags?: Record<string, string>;      // Tags pour catégoriser l'erreur
}

/**
 * Informations détaillées sur une erreur
 */
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  code?: string;
  timestamp: number;
  userId?: string;
  deviceInfo?: Record<string, any>;
  context?: Record<string, any>;
}

/**
 * Valeurs par défaut pour les options de gestion d'erreur
 */
const defaultOptions: ErrorHandlingOptions = {
  isSilent: false,
  reportToSentry: true,
  logLevel: 'error'
};

/**
 * Gestionnaire d'erreurs centralisé
 */
export class ErrorHandler {
  private userId: string | null = null;
  private deviceInfo: Record<string, any> = {};
  
  /**
   * Initialise le gestionnaire d'erreurs
   */
  initialize(userId: string | null, deviceInfo: Record<string, any> = {}) {
    this.userId = userId;
    this.deviceInfo = deviceInfo;
    
    // Configuration de Sentry
    if (userId) {
      Sentry.setUser({ id: userId });
    }
    
    // Gestionnaire d'erreurs global non gérées
    this.setupGlobalErrorHandler();
    
    logger.info('Gestionnaire d\'erreurs initialisé', { userId });
  }
  
  /**
   * Met en place un gestionnaire global pour les erreurs non gérées
   */
  private setupGlobalErrorHandler() {
    // Pour React Native, nous devons utiliser une approche différente
    // car les API d'erreur globales sont différentes
    
    // Utiliser un try-catch pour éviter les erreurs si ces API ne sont pas disponibles
    try {
      // Essayer d'accéder à l'API ErrorUtils spécifique à React Native
      const RNErrorUtils = (global as any).ErrorUtils;
      if (RNErrorUtils && typeof RNErrorUtils.getGlobalHandler === 'function') {
        const originalGlobalHandler = RNErrorUtils.getGlobalHandler();
        
        RNErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
          this.handleError(
            error instanceof Error ? error : new Error(String(error)),
            ErrorType.UNEXPECTED,
            isFatal ? ErrorSeverity.FATAL : ErrorSeverity.ERROR,
            { unhandledException: true, isFatal }
          );
          
          // Maintenir le comportement original
          if (originalGlobalHandler) {
            originalGlobalHandler(error, isFatal);
          }
        });
        
        logger.info('Gestionnaire d\'erreurs global React Native configuré');
      }
    } catch (e) {
      logger.warn('Impossible de configurer le gestionnaire d\'erreurs global React Native', {
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }
  
  /**
   * Gère une erreur avec un type et une gravité spécifiques
   */
  handleError(
    error: Error | string,
    type: ErrorType = ErrorType.UNEXPECTED,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: Record<string, any> = {},
    options: ErrorHandlingOptions = {}
  ): AppError {
    const opts = { ...defaultOptions, ...options };
    const errorObject: AppError = {
      type,
      severity,
      message: typeof error === 'string' ? error : error.message || 'Erreur inconnue',
      originalError: typeof error === 'string' ? undefined : error,
      code: typeof error !== 'string' && 'code' in error ? String((error as any).code) : undefined,
      timestamp: Date.now(),
      userId: this.userId || undefined,
      deviceInfo: this.deviceInfo,
      context
    };
    
    // Log approprié selon la gravité
    switch (opts.logLevel || 'error') {
      case 'debug':
        logger.debug(errorObject.message, this.createLogContext(errorObject));
        break;
      case 'info':
        logger.info(errorObject.message, this.createLogContext(errorObject));
        break;
      case 'warn':
        logger.warn(errorObject.message, this.createLogContext(errorObject));
        break;
      case 'error':
      default:
        logger.error(errorObject.message, this.createLogContext(errorObject));
    }
    
    // Rapport à Sentry si activé
    if (opts.reportToSentry) {
      this.reportToSentry(errorObject, opts);
    }
    
    return errorObject;
  }
  
  /**
   * Crée un contexte de log pour les erreurs
   */
  private createLogContext(error: AppError): Record<string, any> {
    return {
      errorType: error.type,
      severity: error.severity,
      ...(error.code && { errorCode: error.code }),
      ...(error.context && { context: error.context }),
      ...(error.originalError && { 
        stack: error.originalError.stack,
        name: error.originalError.name
      })
    };
  }
  
  /**
   * Envoie un rapport d'erreur à Sentry
   */
  private reportToSentry(error: AppError, options: ErrorHandlingOptions) {
    try {
      // Configuration du contexte
      if (options.userContext) {
        Sentry.setContext('user_context', options.userContext);
      }
      
      if (options.tags) {
        Sentry.setTags(options.tags);
      }
      
      // Ajout de contexte supplémentaire
      Sentry.setContext('error_details', {
        type: error.type,
        severity: error.severity,
        timestamp: error.timestamp,
        ...error.context
      });
      
      // Déterminer le niveau Sentry en fonction de la gravité
      // Conversion de notre enum vers la chaîne Sentry
      let sentryLevel: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
      switch (error.severity) {
        case ErrorSeverity.FATAL:
          sentryLevel = 'fatal';
          break;
        case ErrorSeverity.ERROR:
          sentryLevel = 'error';
          break;
        case ErrorSeverity.WARNING:
          sentryLevel = 'warning';
          break;
        case ErrorSeverity.INFO:
          sentryLevel = 'info';
          break;
        default:
          sentryLevel = 'error';
      }
      
      if (error.originalError) {
        // Capturer l'erreur originale avec le contexte
        Sentry.captureException(error.originalError, {
          level: sentryLevel,
        });
      } else {
        // Capturer le message d'erreur
        Sentry.captureMessage(error.message, {
          level: sentryLevel,
        });
      }
    } catch (sentryError) {
      // Ne pas laisser les erreurs de Sentry casser l'application
      logger.warn('Échec de l\'envoi de l\'erreur à Sentry', { 
        originalError: error.message, 
        sentryError: sentryError instanceof Error ? sentryError.message : String(sentryError)
      });
    }
  }
  
  /**
   * Crée un wrapper pour une fonction qui capture les erreurs
   * @param fn Fonction à wrapper
   * @param errorType Type d'erreur par défaut
   * @param options Options de gestion d'erreur
   */
  createErrorBoundary<T extends (...args: any[]) => any>(
    fn: T,
    errorType: ErrorType = ErrorType.UNEXPECTED,
    options: ErrorHandlingOptions = {}
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          errorType,
          ErrorSeverity.ERROR,
          { functionName: fn.name, arguments: args },
          options
        );
        return undefined;
      }
    };
  }
  
  /**
   * Version async du createErrorBoundary
   */
  createAsyncErrorBoundary<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    errorType: ErrorType = ErrorType.UNEXPECTED,
    options: ErrorHandlingOptions = {}
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          errorType,
          ErrorSeverity.ERROR,
          { functionName: fn.name, arguments: args },
          options
        );
        return undefined;
      }
    };
  }
  
  /**
   * Gère une erreur réseau
   */
  handleNetworkError(error: Error | string, context: Record<string, any> = {}, options: ErrorHandlingOptions = {}) {
    return this.handleError(error, ErrorType.NETWORK, ErrorSeverity.WARNING, context, options);
  }
  
  /**
   * Gère une erreur de base de données
   */
  handleDatabaseError(error: Error | string, context: Record<string, any> = {}, options: ErrorHandlingOptions = {}) {
    return this.handleError(error, ErrorType.DATABASE, ErrorSeverity.ERROR, context, options);
  }
  
  /**
   * Gère une erreur de synchronisation
   */
  handleSyncError(error: Error | string, context: Record<string, any> = {}, options: ErrorHandlingOptions = {}) {
    return this.handleError(error, ErrorType.SYNC, ErrorSeverity.WARNING, context, options);
  }
  
  /**
   * Gère une erreur d'authentification
   */
  handleAuthError(error: Error | string, context: Record<string, any> = {}, options: ErrorHandlingOptions = {}) {
    return this.handleError(error, ErrorType.AUTHENTICATION, ErrorSeverity.ERROR, context, options);
  }
}

// Export d'une instance singleton
export const errorHandler = new ErrorHandler();

export default errorHandler;
