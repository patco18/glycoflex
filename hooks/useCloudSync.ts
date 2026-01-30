import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCloudStorageProvider } from '@/utils/cloudStorageProvider';

/**
 * Hook pour initialiser automatiquement la synchronisation cloud
 * quand l'utilisateur se connecte/déconnecte
 */
export function useCloudSync() {
  const { user } = useAuth();

  useEffect(() => {
    const { hybrid } = getCloudStorageProvider();

    if (user) {
      hybrid.initialize().catch(console.error);
      hybrid.setSyncEnabled(true).catch(console.error);

      console.log('Synchronisation cloud PostgreSQL initialisée pour:', user.email);
    } else {
      hybrid.setSyncEnabled(false).catch(console.error);
      console.log('Synchronisation cloud désactivée');
    }
  }, [user]);

  return { user };
}
