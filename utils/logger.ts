/**
 * Système de logging structuré pour GlycoFlex
 * Permet un suivi et un débogage plus efficaces des opérations
 */
import { LogLevel, LogOptions } from './loggerTypes';

/**
 * Logger configurable pour l'application
 */
export class AppLogger {
  private static defaultLevel: LogLevel = 'info';
  private static moduleLevels: Record<string, LogLevel> = {};
  
  private logLevel: LogLevel;
  private context: string;
  private defaultOptions: LogOptions = {
    timestamp: true,
    includeContext: true,
  };
  
  /**
   * Définit le niveau de log par défaut pour tous les nouveaux loggers
   */
  static setDefaultLevel(level: LogLevel): void {
    AppLogger.defaultLevel = level;
  }
  
  /**
   * Définit le niveau de log pour un module spécifique
   */
  static setModuleLevel(moduleName: string, level: LogLevel): void {
    AppLogger.moduleLevels[moduleName] = level;
  }
  
  /**
   * Crée une nouvelle instance de logger
   * @param context Le contexte du logger (nom du module/composant)
   * @param level Niveau de log minimum à afficher
   */
  constructor(context: string, level?: LogLevel) {
    this.context = context;
    
    // Utiliser le niveau spécifique au module s'il existe, sinon le niveau par défaut
    this.logLevel = level || AppLogger.moduleLevels[context] || AppLogger.defaultLevel;
    
    // Déterminer le niveau de log en fonction de l'environnement
    if (__DEV__) {
      this.logLevel = process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel || 'debug';
    }
  }
  
  /**
   * Log un message de niveau DEBUG
   */
  debug(message: string, data?: any, options?: LogOptions) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, options), data !== undefined ? data : '');
    }
  }
  
  /**
   * Log un message de niveau INFO
   */
  info(message: string, data?: any, options?: LogOptions) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, options), data !== undefined ? data : '');
    }
  }
  
  /**
   * Log un message de niveau WARN
   */
  warn(message: string, data?: any, options?: LogOptions) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, options), data !== undefined ? data : '');
    }
  }
  
  /**
   * Log un message de niveau ERROR
   */
  error(message: string, error?: any, options?: LogOptions) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, options), error !== undefined ? error : '');
    }
  }
  
  /**
   * Change le niveau de log du logger
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }
  
  /**
   * Détermine si un niveau de log doit être affiché
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { 
      'debug': 0, 
      'info': 1, 
      'warn': 2, 
      'error': 3 
    };
    return levels[level] >= levels[this.logLevel];
  }
  
  /**
   * Formate un message de log
   */
  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const opts = { ...this.defaultOptions, ...options };
    
    let formattedMessage = `[${level.toUpperCase()}]`;
    
    if (opts.includeContext) {
      formattedMessage += `[${this.context}]`;
    }
    
    if (opts.timestamp) {
      const now = new Date();
      formattedMessage += `[${now.toISOString()}]`;
    }
    
    formattedMessage += ` ${message}`;
    return formattedMessage;
  }
}

// Logger global pour l'application
export const globalLogger = new AppLogger('Global');

// Intercepter les erreurs non gérées pour le développement React Native
if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
  const ErrorUtils = (global as any).ErrorUtils;
  const originalGlobalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    globalLogger.error(`Erreur non gérée ${isFatal ? 'fatale' : ''}`, error);
    originalGlobalHandler(error, isFatal);
  });
}

export default AppLogger;
