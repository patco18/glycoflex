import { PostgresCloudStorage, PostgresHybridStorage } from '@/utils/postgresCloudStorage';
import { getSyncProvider, SyncProvider } from '@/utils/syncProvider';

export type CloudStorageProvider = {
  provider: SyncProvider;
  hybrid: typeof PostgresHybridStorage;
  cloud: typeof PostgresCloudStorage;
};

export const getCloudStorageProvider = (): CloudStorageProvider => {
  const provider = getSyncProvider();
  return {
    provider,
    hybrid: PostgresHybridStorage,
    cloud: PostgresCloudStorage,
  };
};
