/**
 * Interface pour les mesures de glucose
 */
export interface GlucoseMeasurement {
  /** Identifiant unique */
  id?: string;
  /** Valeur mesurée */
  value: number;
  /** Timestamp UNIX en millisecondes */
  timestamp: number;
  /** Type ou contexte de mesure (à jeun, avant repas, etc.) */
  type?: string;
  /** Notes optionnelles de l'utilisateur */
  notes?: string;
  /** Unité de mesure (optionnelle, ex : mg/dL) */
  unit?: string;
  /** Contexte de repas optionnel */
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
