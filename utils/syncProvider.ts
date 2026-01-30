export type SyncProvider = 'firebase' | 'postgres';

export const getSyncProvider = (): SyncProvider => {
  return process.env.EXPO_PUBLIC_SYNC_PROVIDER === 'postgres' ? 'postgres' : 'firebase';
};

export const isPostgresProvider = (): boolean => getSyncProvider() === 'postgres';
