import AsyncStorage from '@react-native-async-storage/async-storage';

export type GlucoseUnit = 'mgdl' | 'mmoll';

const UNIT_STORAGE_KEY = 'glucose_unit';

// Conversion entre mg/dL et mmol/L
export const convertGlucose = (value: number, fromUnit: GlucoseUnit, toUnit: GlucoseUnit): number => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'mgdl' && toUnit === 'mmoll') {
    return value / 18.0182; // mg/dL to mmol/L
  } else if (fromUnit === 'mmoll' && toUnit === 'mgdl') {
    return value * 18.0182; // mmol/L to mg/dL
  }
  
  return value;
};

// Formatage de la valeur selon l'unité
export const formatGlucoseValue = (value: number, unit: GlucoseUnit): string => {
  if (unit === 'mmoll') {
    return value.toFixed(1);
  }
  return Math.round(value).toString();
};

// Plages normales selon l'unité
export const getNormalRanges = (unit: GlucoseUnit) => {
  if (unit === 'mmoll') {
    return {
      fasting: { min: 3.9, max: 6.1 },
      postMeal: { min: 4.4, max: 7.8 },
      random: { min: 3.9, max: 7.8 },
      low: 3.9,
      high: 7.8,
    };
  } else {
    return {
      fasting: { min: 70, max: 110 },
      postMeal: { min: 80, max: 140 },
      random: { min: 70, max: 140 },
      low: 70,
      high: 140,
    };
  }
};

// Validation des valeurs selon l'unité
export const validateGlucoseValue = (value: number, unit: GlucoseUnit): boolean => {
  if (unit === 'mmoll') {
    return value >= 1.1 && value <= 33.3; // 20-600 mg/dL equivalent
  } else {
    return value >= 20 && value <= 600;
  }
};

// Sauvegarde de l'unité
export const saveGlucoseUnit = async (unit: GlucoseUnit) => {
  try {
    await AsyncStorage.setItem(UNIT_STORAGE_KEY, unit);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'unité:', error);
  }
};

// Chargement de l'unité sauvegardée
export const loadGlucoseUnit = async (): Promise<GlucoseUnit> => {
  try {
    const savedUnit = await AsyncStorage.getItem(UNIT_STORAGE_KEY);
    return (savedUnit as GlucoseUnit) || 'mgdl';
  } catch (error) {
    console.error('Erreur lors du chargement de l\'unité:', error);
    return 'mgdl';
  }
};

// Détection de l'unité par région
export const getRegionalUnit = (): GlucoseUnit => {
  // La plupart des pays utilisent mmol/L, les États-Unis utilisent mg/dL
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const usesImperial = ['en-US', 'en-LR', 'en-MM'].includes(locale);
  return usesImperial ? 'mgdl' : 'mmoll';
};