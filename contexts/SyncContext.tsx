import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { GlucoseMeasurement, SyncStatus } from '../types/glucose';
import * as Auth from '../services/firebase/auth';
import * as Sync from '../services/firebase/sync';
import * as Database from '../services/firebase/database';
import logger from '../utils/logger';

interface SyncContextType {
  syncStatus: SyncStatus;
  isSyncEnabled: boolean;
  toggleSync: () => Promise<void>;
  syncNow: () => Promise<boolean>;
  addMeasurement: (measurement: GlucoseMeasurement) => Promise<void>;
  updateMeasurement: (id: string, measurement: GlucoseMeasurement) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  measurements: GlucoseMeasurement[];
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [measurements, setMeasurements] = useState<GlucoseMeasurement[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncDate: null,
    pendingChanges: 0,
    isSyncing: false,
    error: null,
  });

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      const user = await Auth.getCurrentUser();
      setIsAuthenticated(!!user);
      
      // Charger les préférences de synchronisation
      const prefsString = await AsyncStorage.getItem('user_preferences');
      if (prefsString) {
        const prefs = JSON.parse(prefsString);
        setIsSyncEnabled(prefs.syncEnabled || false);
      }
      
      // Charger le statut de synchronisation
      const lastSync = await Sync.getLastSyncDate();
      if (lastSync) {
        setSyncStatus(prev => ({ ...prev, lastSyncDate: lastSync }));
      }
      
      // Charger les mesures locales
      loadLocalMeasurements();
    };
    
    checkAuth();
  }, []);

  // Configurer les écouteurs de synchronisation en temps réel si connecté et sync activée
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupSync = async () => {
      if (isAuthenticated && isSyncEnabled) {
        // Configurer l'écouteur de changements
        const unsub = await Sync.setupRealtimeSyncListeners((updatedMeasurements) => {
          // Fusionner avec les données locales
          mergeAndUpdateLocalMeasurements(updatedMeasurements);
        });
        
        if (unsub) unsubscribe = unsub;
        
        // Effectuer une synchronisation complète au démarrage
        syncNow();
      }
    };
    
    setupSync();
    
    return () => {
      // Nettoyer l'écouteur lors du démontage
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, isSyncEnabled]);

  // Surveiller les changements de connectivité réseau
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && isSyncEnabled && syncStatus.pendingChanges > 0) {
        // Tenter de synchroniser les changements en attente si la connexion est rétablie
        Sync.processSyncQueue().then(success => {
          if (success) {
            updatePendingChangesCount();
          }
        });
      }
    });
    
    return () => unsubscribe();
  }, [isSyncEnabled, syncStatus.pendingChanges]);

  // Charger les mesures locales
  const loadLocalMeasurements = async () => {
    try {
      const storedMeasurements = await AsyncStorage.getItem('glucose_measurements');
      if (storedMeasurements) {
        setMeasurements(JSON.parse(storedMeasurements));
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des mesures locales:', error);
    }
  };

  // Mettre à jour le compteur de changements en attente
  const updatePendingChangesCount = async () => {
    try {
      const queueString = await AsyncStorage.getItem('glucose_app_sync_queue');
      const queue = queueString ? JSON.parse(queueString) : [];
      setSyncStatus(prev => ({ ...prev, pendingChanges: queue.length }));
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du compteur de changements:', error);
    }
  };

  // Fusionner les mesures du cloud avec les mesures locales
  const mergeAndUpdateLocalMeasurements = (cloudMeasurements: GlucoseMeasurement[]) => {
    setMeasurements(prevMeasurements => {
      // Créer une carte des mesures par ID
      const measurementsMap = new Map<string, GlucoseMeasurement>();
      
      // Ajouter d'abord les mesures locales
      prevMeasurements.forEach(m => {
        if (m.id) measurementsMap.set(m.id, m);
      });
      
      // Puis remplacer ou ajouter les mesures du cloud
      cloudMeasurements.forEach(m => {
        if (m.id) measurementsMap.set(m.id, m);
      });
      
      // Ajouter les mesures locales sans ID (pas encore synchronisées)
      const localWithoutId = prevMeasurements.filter(m => !m.id);
      
      const mergedMeasurements = [...measurementsMap.values(), ...localWithoutId];
      
      // Sauvegarder dans AsyncStorage
      AsyncStorage.setItem('glucose_measurements', JSON.stringify(mergedMeasurements))
        .catch(error => logger.error('Erreur lors de la sauvegarde des mesures:', error));
      
      return mergedMeasurements;
    });
  };

  // Activer/désactiver la synchronisation
  const toggleSync = async () => {
    try {
      const newValue = !isSyncEnabled;
      setIsSyncEnabled(newValue);
      
      // Mettre à jour les préférences utilisateur
      const prefsString = await AsyncStorage.getItem('user_preferences');
      const prefs = prefsString ? JSON.parse(prefsString) : {};
      const updatedPrefs = { ...prefs, syncEnabled: newValue };
      await AsyncStorage.setItem('user_preferences', JSON.stringify(updatedPrefs));
      
      // Si la synchronisation est activée, effectuer une synchronisation initiale
      if (newValue && isAuthenticated) {
        syncNow();
      }
    } catch (error) {
      logger.error('Erreur lors de la modification des préférences de synchronisation:', error);
    }
  };

  // Synchroniser maintenant
  const syncNow = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const success = await Sync.fullSync();
      
      if (success) {
        const lastSync = await Sync.getLastSyncDate();
        setSyncStatus(prev => ({ 
          ...prev, 
          isSyncing: false, 
          lastSyncDate: lastSync,
          pendingChanges: 0,
          error: null 
        }));
        
        // Recharger les mesures locales après la synchronisation
        loadLocalMeasurements();
      } else {
        setSyncStatus(prev => ({ 
          ...prev, 
          isSyncing: false, 
          error: "Échec de la synchronisation" 
        }));
      }
      
      return success;
    } catch (error) {
      logger.error('Erreur lors de la synchronisation:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      }));
      return false;
    }
  };

  // Ajouter une mesure (localement et dans la file de synchronisation)
  const addMeasurement = async (measurement: GlucoseMeasurement) => {
    // Enregistrer localement
    const newMeasurement = { ...measurement };
    setMeasurements(prev => {
      const updated = [...prev, newMeasurement];
      AsyncStorage.setItem('glucose_measurements', JSON.stringify(updated))
        .catch(error => logger.error('Erreur lors de la sauvegarde des mesures:', error));
      return updated;
    });
    
    // Si la synchronisation est activée, ajouter à la file d'attente
    if (isSyncEnabled) {
      await Sync.queueSyncOperation({
        type: 'add',
        id: newMeasurement.id || '',
        data: newMeasurement,
        timestamp: Date.now()
      });
      
      updatePendingChangesCount();
      
      // Tenter de synchroniser immédiatement si connecté
      const netInfoState = await NetInfo.fetch();
      if (netInfoState.isConnected) {
        Sync.processSyncQueue().then(success => {
          if (success) {
            updatePendingChangesCount();
          }
        });
      }
    }
  };

  // Mettre à jour une mesure
  const updateMeasurement = async (id: string, measurement: GlucoseMeasurement) => {
    // Mettre à jour localement
    setMeasurements(prev => {
      const updated = prev.map(m => (m.id === id ? { ...measurement, id } : m));
      AsyncStorage.setItem('glucose_measurements', JSON.stringify(updated))
        .catch(error => logger.error('Erreur lors de la sauvegarde des mesures:', error));
      return updated;
    });
    
    // Si la synchronisation est activée, ajouter à la file d'attente
    if (isSyncEnabled) {
      await Sync.queueSyncOperation({
        type: 'update',
        id,
        data: { ...measurement, id },
        timestamp: Date.now()
      });
      
      updatePendingChangesCount();
      
      // Tenter de synchroniser immédiatement si connecté
      const netInfoState = await NetInfo.fetch();
      if (netInfoState.isConnected) {
        Sync.processSyncQueue().then(success => {
          if (success) {
            updatePendingChangesCount();
          }
        });
      }
    }
  };

  // Supprimer une mesure
  const deleteMeasurement = async (id: string) => {
    // Supprimer localement
    setMeasurements(prev => {
      const updated = prev.filter(m => m.id !== id);
      AsyncStorage.setItem('glucose_measurements', JSON.stringify(updated))
        .catch(error => logger.error('Erreur lors de la sauvegarde des mesures:', error));
      return updated;
    });
    
    // Si la synchronisation est activée, ajouter à la file d'attente
    if (isSyncEnabled) {
      await Sync.queueSyncOperation({
        type: 'delete',
        id,
        timestamp: Date.now()
      });
      
      updatePendingChangesCount();
      
      // Tenter de synchroniser immédiatement si connecté
      const netInfoState = await NetInfo.fetch();
      if (netInfoState.isConnected) {
        Sync.processSyncQueue().then(success => {
          if (success) {
            updatePendingChangesCount();
          }
        });
      }
    }
  };

  // Connexion
  const signIn = async (email: string, password: string) => {
    try {
      await Auth.signInWithEmail(email, password);
      setIsAuthenticated(true);
      
      // Charger les données depuis le cloud si la synchronisation est activée
      if (isSyncEnabled) {
        syncNow();
      }
    } catch (error) {
      logger.error('Erreur lors de la connexion:', error);
      throw error;
    }
  };

  // Inscription
  const signUp = async (email: string, password: string) => {
    try {
      await Auth.signUpWithEmail(email, password);
      setIsAuthenticated(true);
    } catch (error) {
      logger.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  };

  // Déconnexion
  const signOut = async () => {
    try {
      await Auth.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        isSyncEnabled,
        toggleSync,
        syncNow,
        addMeasurement,
        updateMeasurement,
        deleteMeasurement,
        measurements,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};
