let SentryModule: typeof import('sentry-expo') | null = null;

async function getSentry() {
  if (!SentryModule) {
    SentryModule = await import('sentry-expo');
  }
  return SentryModule;
}

export async function initLogService(dsn?: string) {
  const cleanDsn = dsn?.trim();

  // Ne rien faire si DSN invalide
  if (!cleanDsn || !cleanDsn.startsWith('http')) {
    console.log('🟡 LogService: Sentry désactivé (DSN vide/invalide)');
    return;
  }

  const Sentry = await getSentry();
  Sentry.init({
    dsn: cleanDsn,
    enableInExpoDevelopment: true,
    debug: __DEV__,
    tracesSampleRate: 1.0,
  });
}

export async function logError(error: unknown) {
  const Sentry = await getSentry();
  Sentry.Native.captureException(error);
}

export async function logMessage(message: string) {
  const Sentry = await getSentry();
  Sentry.Native.captureMessage(message);
}
