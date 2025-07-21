import { GlucoseMeasurement } from './storage';

export type GlucoseStatus = 'low' | 'normal' | 'high';

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  count: number;
}

export const getGlucoseStatus = (value: number): GlucoseStatus => {
  if (value < 70) return 'low';
  if (value > 140) return 'high';
  return 'normal';
};

export const calculateStats = (measurements: GlucoseMeasurement[]): GlucoseStats => {
  if (measurements.length === 0) {
    return { average: 0, min: 0, max: 0, count: 0 };
  }

  const values = measurements.map(m => m.value);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    average,
    min,
    max,
    count: measurements.length,
  };
};

export const getGlucoseRecommendation = (value: number, type: string): string => {
  const status = getGlucoseStatus(value);
  
  switch (status) {
    case 'low':
      return 'Glycémie basse. Consommez des glucides rapides et consultez votre médecin.';
    case 'high':
      return 'Glycémie élevée. Vérifiez votre alimentation et consultez votre médecin.';
    case 'normal':
      return 'Glycémie dans la normale. Continuez vos bonnes habitudes.';
    default:
      return '';
  }
};

export const filterMeasurementsByDateRange = (
  measurements: GlucoseMeasurement[],
  startDate: Date,
  endDate: Date
): GlucoseMeasurement[] => {
  return measurements.filter(m => {
    const measurementDate = new Date(m.timestamp);
    return measurementDate >= startDate && measurementDate <= endDate;
  });
};

export const groupMeasurementsByDate = (measurements: GlucoseMeasurement[]): { [date: string]: GlucoseMeasurement[] } => {
  return measurements.reduce((groups, measurement) => {
    const date = new Date(measurement.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(measurement);
    return groups;
  }, {} as { [date: string]: GlucoseMeasurement[] });
};