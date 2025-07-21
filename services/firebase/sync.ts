import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Database from "./database";
import { getCurrentUser } from "./auth";
import { GlucoseMeasurement } from "../../types/glucose.d";

// Clés pour le stockage local
const SYNC_QUEUE_KEY = "glucose_app_sync_queue";
const LAST_SYNC_KEY = "glucose_app_last_sync";

// Interface pour les opérations en file d'attente
interface SyncQueueItem {
  type: "add" | "update" | "delete";
  id: string;
  data?: GlucoseMeasurement;
  timestamp: number;
}

/**
 * Ajoute une opération à la file d'attente de synchronisation
 */
export const queueSyncOperation = async (
  operation: SyncQueueItem
): Promise<void> => {
  try {
    // Récupérer la file d'attente existante
    const queueString = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncQueueItem[] = queueString ? JSON.parse(queueString) : [];
    
    // Ajouter la nouvelle opération
    queue.push(operation);
    
    // Sauvegarder la file d'attente mise à jour
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Erreur lors de l'ajout à la file d'attente de synchronisation:", error);
  }
};

/**
 * Tente de synchroniser les opérations en attente avec le cloud
 */
export const processSyncQueue = async (): Promise<boolean> => {
  const netInfoState = await NetInfo.fetch();
  
  if (!netInfoState.isConnected) {
    console.log("Pas de connexion internet, synchronisation reportée");
    return false;
  }
  
  const user = await getCurrentUser();
  if (!user) {
    console.log("Utilisateur non connecté, synchronisation reportée");
    return false;
  }
  
  try {
    // Récupérer la file d'attente
    const queueString = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueString) return true; // Rien à synchroniser
    
    const queue: SyncQueueItem[] = JSON.parse(queueString);
    if (queue.length === 0) return true;
    
    // Traiter chaque opération en file d'attente
    const failedOperations: SyncQueueItem[] = [];
    
    for (const operation of queue) {
      try {
        switch (operation.type) {
          case "add":
            if (operation.data) {
              await Database.addMeasurement(user.uid, operation.data);
            }
            break;
          case "update":
            if (operation.data) {
              await Database.updateMeasurement(user.uid, operation.id, operation.data);
            }
            break;
          case "delete":
            await Database.deleteMeasurement(user.uid, operation.id);
            break;
        }
      } catch (error) {
        console.error(`Erreur lors de la synchronisation de l'opération ${operation.type}:`, error);
        failedOperations.push(operation);
      }
    }
    
    // Mettre à jour la file d'attente avec seulement les opérations échouées
    if (failedOperations.length > 0) {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedOperations));
    } else {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    }
    
    // Mettre à jour la date de dernière synchronisation
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    
    return failedOperations.length === 0;
  } catch (error) {
    console.error("Erreur lors du traitement de la file d'attente de synchronisation:", error);
    return false;
  }
};

/**
 * Synchronise toutes les données locales avec le cloud
 */
export const fullSync = async (): Promise<boolean> => {
  const netInfoState = await NetInfo.fetch();
  
  if (!netInfoState.isConnected) {
    console.log("Pas de connexion internet, synchronisation complète reportée");
    return false;
  }
  
  const user = await getCurrentUser();
  if (!user) {
    console.log("Utilisateur non connecté, synchronisation complète reportée");
    return false;
  }
  
  try {
    // D'abord, traiter la file d'attente de synchronisation
    await processSyncQueue();
    
    // Récupérer toutes les mesures depuis le serveur
    const serverMeasurements = await Database.getAllMeasurements(user.uid);
    
    // Récupérer toutes les mesures locales
    const localMeasurementsJson = await AsyncStorage.getItem("glucose_measurements");
    const localMeasurements: GlucoseMeasurement[] = localMeasurementsJson 
      ? JSON.parse(localMeasurementsJson) 
      : [];
    
    // Créer une carte des mesures par ID pour faciliter les comparaisons
    const serverMeasurementsMap = new Map<string, GlucoseMeasurement>();
    serverMeasurements.forEach(m => {
      if (m.id) serverMeasurementsMap.set(m.id, m);
    });
    
    const localMeasurementsMap = new Map<string, GlucoseMeasurement>();
    localMeasurements.forEach(m => {
      if (m.id) localMeasurementsMap.set(m.id, m);
    });
    
    // Fusionner les mesures locales et serveur
    const mergedMeasurements: GlucoseMeasurement[] = [];
    
    // Ajouter les mesures du serveur
    serverMeasurementsMap.forEach((measurement) => {
      mergedMeasurements.push(measurement);
    });
    
    // Ajouter les mesures locales qui n'ont pas d'ID (pas encore synchronisées)
    localMeasurements.forEach((measurement) => {
      if (!measurement.id) {
        mergedMeasurements.push(measurement);
      }
    });
    
    // Sauvegarder les mesures fusionnées localement
    await AsyncStorage.setItem("glucose_measurements", JSON.stringify(mergedMeasurements));
    
    // Mettre à jour la date de dernière synchronisation
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la synchronisation complète:", error);
    return false;
  }
};

/**
 * Récupère la date de dernière synchronisation
 */
export const getLastSyncDate = async (): Promise<Date | null> => {
  try {
    const lastSyncString = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (lastSyncString) {
      return new Date(lastSyncString);
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de la date de dernière synchronisation:", error);
    return null;
  }
};

/**
 * Configure les écouteurs de changements pour la synchronisation en temps réel
 */
export const setupRealtimeSyncListeners = (
  onDataChange: (measurements: GlucoseMeasurement[]) => void
) => {
  const setupListeners = async () => {
    const user = await getCurrentUser();
    if (!user) return null;
    
    return Database.subscribeMeasurements(user.uid, onDataChange);
  };
  
  return setupListeners();
};
