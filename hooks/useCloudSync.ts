import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SecureHybridStorage } from '@/utils/secureCloudStorage';

/**
 * Hook pour initialiser automatiquement la synchronisation cloud
 * quand l'utilisateur se connecte/déconnecte
 */
export function useCloudSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Utilisateur connecté : initialiser la synchronisation cloud
      SecureHybridStorage.initialize().catch(console.error);
      
      // Activer la synchronisation si elle n'est pas déjà activée
      SecureHybridStorage.setSyncEnabled(true).catch(console.error);

  // Démarrer les écouteurs automatiques et l'abonnement temps réel
  SecureHybridStorage.startAutoSyncListeners().catch(console.error);
  SecureHybridStorage.startRealtimeSubscription().catch(console.error);
      
      console.log('Synchronisation cloud initialisée pour:', user.email);
    } else {
      // Utilisateur déconnecté : désactiver la synchronisation cloud
      SecureHybridStorage.setSyncEnabled(false).catch(console.error);

  // Arrêter les écouteurs et l'abonnement
  SecureHybridStorage.stopRealtimeSubscription().catch(console.error);
  SecureHybridStorage.stopAutoSyncListeners().catch(console.error);
      
      console.log('Synchronisation cloud désactivée');
    }
  }, [user]);

  return { user };
}
