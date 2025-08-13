import * as Sentry from 'sentry-expo';

export function initLogService(dsn?: string) {
  Sentry.init({
    dsn,
    enableInExpoDevelopment: true,
    debug: __DEV__, // If `true`, Sentry will try to print out useful debugging information
    tracesSampleRate: 1.0
  });
}

export function logError(error: unknown) {
  Sentry.Native.captureException(error);
}

export function logMessage(message: string) {
  Sentry.Native.captureMessage(message);
}
