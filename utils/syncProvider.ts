export type SyncProvider = 'postgres';

export const getSyncProvider = (): SyncProvider => 'postgres';

export const isPostgresProvider = (): boolean => true;
