declare module '../../types/glucose' {
  /**
   * Interface pour les mesures de glucose
   */
  export interface GlucoseMeasurement {
    id?: string;
    value: number;
    date: string; // ISO String
    unit: string;
    notes?: string;
    mealContext?: string;
  }

  /**
   * Énumération pour les contextes de repas
   */
  export enum MealContext {
    BEFORE_BREAKFAST = "BEFORE_BREAKFAST",
    AFTER_BREAKFAST = "AFTER_BREAKFAST",
    BEFORE_LUNCH = "BEFORE_LUNCH",
    AFTER_LUNCH = "AFTER_LUNCH",
    BEFORE_DINNER = "BEFORE_DINNER",
    AFTER_DINNER = "AFTER_DINNER",
    BEDTIME = "BEDTIME",
    FASTING = "FASTING",
    OTHER = "OTHER"
  }

  /**
   * Interface pour les statistiques des mesures de glucose
   */
  export interface GlucoseStats {
    average: number;
    min: number;
    max: number;
    inTargetRange: number; // Pourcentage
    belowTarget: number;   // Pourcentage
    aboveTarget: number;   // Pourcentage
    stdDeviation: number;
  }

  /**
   * Interface pour les préférences utilisateur
   */
  export interface UserPreferences {
    unit: string;
    language: string;
    targetRangeMin: number;
    targetRangeMax: number;
    notificationsEnabled: boolean;
    theme: string;
    syncEnabled: boolean;
    automaticSync: boolean;
  }

  /**
   * Interface pour le statut de synchronisation
   */
  export interface SyncStatus {
    lastSyncDate: Date | null;
    pendingChanges: number;
    isSyncing: boolean;
    error: string | null;
  }
}
