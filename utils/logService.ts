import * as Sentry from '@sentry/react-native';

export function initLogService(dsn?: string) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0
  });
}

export function logError(error: unknown) {
  Sentry.captureException(error);
}

export function logMessage(message: string) {
  Sentry.captureMessage(message);
}
