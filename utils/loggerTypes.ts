/**
 * Types partagés pour le système de logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  timestamp?: boolean;
  includeContext?: boolean;
}
