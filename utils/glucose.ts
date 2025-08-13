import { GlucoseMeasurement } from './storage';

export type GlucoseStatus = 'low' | 'normal' | 'high';

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  count: number;
  timeInRange?: number;   // Pourcentage de temps dans la plage cible
  lowCount?: number;      // Nombre de mesures basses
  highCount?: number;     // Nombre de mesures hautes
  normalCount?: number;   // Nombre de mesures normales
}

export interface GlucoseTarget {
  min: number;
  max: number;
  unit: string;
}

// Fonction pour obtenir le statut glycémique en utilisant les objectifs personnalisés
export const getGlucoseStatus = (
  value: number, 
  targetMin: number = 70, 
  targetMax: number = 140
): GlucoseStatus => {
  if (value < targetMin) return 'low';
  if (value > targetMax) return 'high';
  return 'normal';
};

export const calculateStats = (
  measurements: GlucoseMeasurement[], 
  targetMin: number = 70, 
  targetMax: number = 140
): GlucoseStats => {
  if (measurements.length === 0) {
    return { 
      average: 0, 
      min: 0, 
      max: 0, 
      count: 0, 
      timeInRange: 0, 
      lowCount: 0, 
      highCount: 0, 
      normalCount: 0 
    };
  }

  const values = measurements.map(m => m.value);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Calculer les statistiques supplémentaires basées sur les objectifs personnalisés
  let lowCount = 0;
  let highCount = 0;
  let normalCount = 0;
  
  measurements.forEach(m => {
    const status = getGlucoseStatus(m.value, targetMin, targetMax);
    if (status === 'low') lowCount++;
    else if (status === 'high') highCount++;
    else normalCount++;
  });
  
  const timeInRange = (normalCount / measurements.length) * 100;

  return {
    average,
    min,
    max,
    count: measurements.length,
    timeInRange,
    lowCount,
    highCount,
    normalCount
  };
};

export const getGlucoseRecommendation = (
  value: number, 
  type: string,
  targetMin: number = 70, 
  targetMax: number = 140
): string => {
  const status = getGlucoseStatus(value, targetMin, targetMax);
  
  // Adaptations selon le type de mesure
  const typeContext = type.toLowerCase().includes('repas') ? 
    'après repas' : 
    type.toLowerCase().includes('jeun') ? 
    'à jeun' : '';
  
  switch (status) {
    case 'low':
      if (value < targetMin * 0.7) {
        return `Glycémie très basse ${typeContext}. Consommez immédiatement des glucides rapides (15-20g) et contactez votre médecin si nécessaire.`;
      }
      return `Glycémie basse ${typeContext}. Consommez des glucides rapides (10-15g) comme du jus de fruit ou des comprimés de glucose.`;
    
    case 'high':
      if (value > targetMax * 1.5) {
        return `Glycémie très élevée ${typeContext}. Vérifiez la présence de cétones, hydratez-vous et consultez votre médecin rapidement.`;
      }
      return `Glycémie élevée ${typeContext}. Buvez de l'eau et surveillez votre alimentation. Une activité physique modérée peut aider à réduire votre glycémie.`;
    
    case 'normal':
      const isLowerRange = value < (targetMin + (targetMax - targetMin) * 0.3);
      const isHigherRange = value > (targetMin + (targetMax - targetMin) * 0.7);
      
      if (isLowerRange) {
        return `Glycémie dans la fourchette basse de vos objectifs. Continuez à surveiller régulièrement.`;
      } else if (isHigherRange) {
        return `Glycémie dans la fourchette haute de vos objectifs. Restez vigilant sur votre alimentation.`;
      }
      return `Glycémie idéale ${typeContext}. Continuez vos bonnes habitudes.`;
    
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

export type TrendDirection = 'stable' | 'increasing' | 'decreasing' | 'fluctuating';

export const analyzeTrend = (
  measurements: GlucoseMeasurement[],
  targetMin: number = 70,
  targetMax: number = 140,
  days: number = 7
): { direction: TrendDirection; recommendation: string; timeInRange: number; achievementLevel: string } => {
  if (measurements.length < 3) {
    return { 
      direction: 'stable', 
      recommendation: 'Pas assez de données pour analyser une tendance. Continuez à enregistrer vos mesures régulièrement.',
      timeInRange: 0,
      achievementLevel: 'insufficient' 
    };
  }
  
  // Trier les mesures par date
  const sortedMeasurements = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculer les moyennes par jour
  const dayGroups = groupMeasurementsByDate(sortedMeasurements);
  
  const dailyAverages = Object.entries(dayGroups)
    .map(([date, dayMeasurements]) => {
      const values = dayMeasurements.map(m => m.value);
      const sum = values.reduce((acc, val) => acc + val, 0);
      return { date, average: sum / values.length };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-days); // Prendre seulement les derniers X jours
  
  if (dailyAverages.length < 2) {
    return { 
      direction: 'stable', 
      recommendation: 'Continuez à mesurer quotidiennement pour obtenir une analyse de tendance.',
      timeInRange: calculateTimeInRange(sortedMeasurements, targetMin, targetMax),
      achievementLevel: 'insufficient'
    };
  }
  
  // Calculer la tendance
  const firstAvg = dailyAverages[0].average;
  const lastAvg = dailyAverages[dailyAverages.length - 1].average;
  const difference = lastAvg - firstAvg;
  const threshold = (targetMax - targetMin) * 0.1; // 10% de la plage cible
  
  // Calculer les fluctuations
  let fluctuations = 0;
  for (let i = 1; i < dailyAverages.length; i++) {
    const diff = Math.abs(dailyAverages[i].average - dailyAverages[i-1].average);
    if (diff > threshold) fluctuations++;
  }
  
  const timeInRange = calculateTimeInRange(sortedMeasurements, targetMin, targetMax);
  let direction: TrendDirection;
  let recommendation: string;
  let achievementLevel: string;
  
  // Déterminer le niveau d'accomplissement basé sur le pourcentage dans la plage cible
  if (timeInRange >= 80) {
    achievementLevel = 'excellent';
  } else if (timeInRange >= 65) {
    achievementLevel = 'good';
  } else if (timeInRange >= 50) {
    achievementLevel = 'moderate';
  } else {
    achievementLevel = 'poor';
  }
  
  if (fluctuations > dailyAverages.length * 0.4) {
    direction = 'fluctuating';
    recommendation = `Vos valeurs glycémiques fluctuent considérablement. Essayez de maintenir des horaires de repas plus réguliers et surveillez votre alimentation. ${timeInRange < 50 ? 'Consultez votre médecin pour ajuster votre traitement.' : ''}`;
  } else if (Math.abs(difference) < threshold) {
    direction = 'stable';
    if (timeInRange > 70) {
      recommendation = `Excellente stabilité glycémique dans votre plage cible (${targetMin}-${targetMax}). Continuez vos bonnes habitudes.`;
    } else if (timeInRange > 50) {
      recommendation = `Glycémie relativement stable, mais il y a encore place à amélioration pour atteindre vos objectifs personnels (${targetMin}-${targetMax}).`;
    } else {
      recommendation = `Vos valeurs sont stables mais souvent en dehors de vos objectifs (${targetMin}-${targetMax}). Consultez votre médecin pour ajuster votre plan de traitement.`;
    }
  } else if (difference > 0) {
    direction = 'increasing';
    recommendation = `Votre glycémie moyenne est en hausse. Revoyez votre alimentation, votre activité physique ${timeInRange < 60 ? `et consultez votre médecin pour atteindre votre objectif (${targetMin}-${targetMax}).` : `et soyez vigilant pour rester dans votre plage cible (${targetMin}-${targetMax}).`}`;
  } else {
    direction = 'decreasing';
    if (firstAvg > targetMax && lastAvg > targetMin) {
      recommendation = `Votre glycémie moyenne diminue, c'est positif. Continuez vos efforts pour atteindre vos objectifs personnels (${targetMin}-${targetMax}).`;
    } else if (lastAvg < targetMin) {
      recommendation = `Attention, votre glycémie moyenne diminue et pourrait devenir trop basse (inférieure à ${targetMin}). Surveillez votre alimentation et consultez votre médecin.`;
    } else {
      recommendation = `Votre glycémie moyenne diminue. Continuez à surveiller vos valeurs régulièrement pour rester dans votre plage cible (${targetMin}-${targetMax}).`;
    }
  }
  
  return { direction, recommendation, timeInRange, achievementLevel };
};

// Fonction utilitaire pour calculer le temps dans la plage cible
const calculateTimeInRange = (
  measurements: GlucoseMeasurement[],
  targetMin: number,
  targetMax: number
): number => {
  if (measurements.length === 0) return 0;
  
  let inRangeCount = 0;
  measurements.forEach(m => {
    if (m.value >= targetMin && m.value <= targetMax) {
      inRangeCount++;
    }
  });
  
  return (inRangeCount / measurements.length) * 100;
};