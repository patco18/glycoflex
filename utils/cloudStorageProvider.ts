import { SecureCloudStorage, SecureHybridStorage } from '@/utils/secureCloudStorage';
import { PostgresCloudStorage, PostgresHybridStorage } from '@/utils/postgresCloudStorage';
import { getSyncProvider, SyncProvider } from '@/utils/syncProvider';

export type CloudStorageProvider = {
  provider: SyncProvider;
  hybrid: typeof SecureHybridStorage | typeof PostgresHybridStorage;
  cloud: typeof SecureCloudStorage | typeof PostgresCloudStorage;
};

export const getCloudStorageProvider = (): CloudStorageProvider => {
  const provider = getSyncProvider();
  if (provider === 'postgres') {
    return {
      provider,
      hybrid: PostgresHybridStorage,
      cloud: PostgresCloudStorage,
    };
  }

  return {
    provider,
    hybrid: SecureHybridStorage,
    cloud: SecureCloudStorage,
  };
};
