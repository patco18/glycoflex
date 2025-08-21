/**
 * Système de validation des données pour GlycoFlex
 * Assure la cohérence et l'intégrité des données avant stockage
 * et après récupération
 */
import { AppLogger } from './logger';

const logger = new AppLogger('Validation');

/**
 * Type de base pour un validateur
 */
type Validator<T> = (value: any) => value is T;

/**
 * Schéma de validation pour un objet
 */
type ValidationSchema<T> = {
  [K in keyof T]: Validator<T[K] | (undefined extends T[K] ? undefined : never)>;
};

/**
 * Résultat d'une validation
 */
interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

/**
 * Validateurs de base pour les types courants
 */
export const validators = {
  /**
   * Valide que la valeur est une chaîne non vide
   */
  isNonEmptyString: (value: any): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  },
  
  /**
   * Valide que la valeur est un nombre
   */
  isNumber: (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },
  
  /**
   * Valide que la valeur est un nombre positif
   */
  isPositiveNumber: (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && value >= 0;
  },
  
  /**
   * Valide que la valeur est un nombre dans une plage
   */
  isNumberInRange: (min: number, max: number) => {
    return (value: any): value is number => {
      return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
    };
  },
  
  /**
   * Valide que la valeur est un timestamp valide
   */
  isValidTimestamp: (value: any): value is number => {
    return typeof value === 'number' && 
           !isNaN(value) && 
           value > 0 && 
           value <= Date.now() + 86400000; // Autoriser jusqu'à 1 jour dans le futur
  },
  
  /**
   * Valide que la valeur est une chaîne d'ID valide
   */
  isValidId: (value: any): value is string => {
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,50}$/.test(value);
  },
  
  /**
   * Valide que la valeur est un booléen
   */
  isBoolean: (value: any): value is boolean => {
    return typeof value === 'boolean';
  },
  
  /**
   * Valide que la valeur est un objet
   */
  isObject: (value: any): value is object => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },
  
  /**
   * Valide que la valeur est un tableau
   */
  isArray: <T>(itemValidator?: Validator<T>) => {
    return (value: any): value is T[] => {
      if (!Array.isArray(value)) return false;
      
      if (itemValidator) {
        return value.every(item => itemValidator(item));
      }
      
      return true;
    };
  },
  
  /**
   * Valide que la valeur est une des valeurs possibles
   */
  isOneOf: <T extends string | number>(possibleValues: readonly T[]) => {
    return (value: any): value is T => {
      return possibleValues.includes(value as T);
    };
  },
  
  /**
   * Validateur optionnel qui accepte undefined
   */
  optional: <T>(validator: Validator<T>) => {
    return (value: any): value is T | undefined => {
      return value === undefined || validator(value);
    };
  }
};

/**
 * Classe pour valider les données selon un schéma
 */
export class DataValidator<T extends object> {
  private schema: ValidationSchema<T>;
  private name: string;
  
  /**
   * Crée un nouveau validateur de données
   * @param name Nom du type de données (pour les logs)
   * @param schema Schéma de validation
   */
  constructor(name: string, schema: ValidationSchema<T>) {
    this.name = name;
    this.schema = schema;
  }
  
  /**
   * Valide un objet selon le schéma
   * @param data Données à valider
   * @returns Résultat de la validation
   */
  validate(data: any): ValidationResult {
    if (!validators.isObject(data)) {
      return { 
        isValid: false, 
        errors: { _global: `Les données ne sont pas un objet valide` } 
      };
    }
    
    const result: ValidationResult = { isValid: true, errors: {} };
    
    // Vérifier chaque champ selon le schéma
    for (const [key, validator] of Object.entries(this.schema) as [keyof T & string, Validator<any>][]) {
      if (!(key in data)) {
        result.isValid = false;
        result.errors[key] = `Champ requis manquant`;
        continue;
      }
      
      const value = data[key as keyof typeof data];
      if (!validator(value)) {
        result.isValid = false;
        result.errors[key] = `Valeur invalide pour ${key}: ${JSON.stringify(value)}`;
      }
    }
    
    // Vérifier qu'il n'y a pas de champs supplémentaires
    for (const key of Object.keys(data)) {
      if (!(key in this.schema)) {
        // Autoriser certains champs spéciaux
        if (['id', '_id', 'userId'].includes(key)) continue;
        
        logger.warn(`Champ non défini dans le schéma: ${key}`, { 
          objectType: this.name, 
          value: data[key as keyof typeof data] 
        });
      }
    }
    
    // Journaliser les échecs de validation
    if (!result.isValid) {
      logger.warn(`Validation échouée pour ${this.name}`, result.errors);
    }
    
    return result;
  }
  
  /**
   * Valide un objet et lance une exception en cas d'échec
   * @param data Données à valider
   * @returns Les données validées typées
   * @throws Error en cas d'échec de validation
   */
  validateOrThrow(data: any): T {
    const result = this.validate(data);
    
    if (!result.isValid) {
      const errorMsg = Object.entries(result.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(', ');
        
      throw new Error(`Validation failed for ${this.name}: ${errorMsg}`);
    }
    
    return data as T;
  }
  
  /**
   * Valide un tableau d'objets
   * @param items Tableau d'objets à valider
   * @returns Résultats de validation pour chaque objet
   */
  validateArray(items: any[]): { validItems: T[], invalidItems: any[], results: ValidationResult[] } {
    if (!Array.isArray(items)) {
      throw new Error(`validateArray s'attend à un tableau, reçu ${typeof items}`);
    }
    
    const validItems: T[] = [];
    const invalidItems: any[] = [];
    const results: ValidationResult[] = [];
    
    for (const item of items) {
      const result = this.validate(item);
      results.push(result);
      
      if (result.isValid) {
        validItems.push(item as T);
      } else {
        invalidItems.push(item);
      }
    }
    
    return { validItems, invalidItems, results };
  }
}

/**
 * Schéma de validation pour une mesure de glycémie
 */
export interface GlucoseMeasurement {
  value: number;              // Valeur en mg/dL
  timestamp: number;          // Timestamp en ms
  measurementId: string;      // ID unique
  deviceId?: string;          // ID du dispositif (optionnel)
  mealContext?: 'before' | 'after' | 'fasting'; // Contexte du repas
  notes?: string;            // Notes (optionnel)
  tags?: string[];           // Tags (optionnel)
}

/**
 * Validateur pour les mesures de glycémie
 */
export const glucoseMeasurementValidator = new DataValidator<GlucoseMeasurement>('GlucoseMeasurement', {
  value: validators.isNumberInRange(0, 600),
  timestamp: validators.isValidTimestamp,
  measurementId: validators.isValidId,
  deviceId: validators.optional(validators.isValidId),
  mealContext: validators.optional(
    validators.isOneOf(['before', 'after', 'fasting'] as const)
  ),
  notes: validators.optional(validators.isNonEmptyString),
  tags: validators.optional(validators.isArray(validators.isNonEmptyString))
});

export default {
  validators,
  DataValidator,
  glucoseMeasurementValidator
};
