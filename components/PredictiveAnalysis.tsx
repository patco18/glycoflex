import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, Target } from 'lucide-react-native';
import { GlucoseMeasurement } from '@/utils/storage';
import { getGlucoseStatus } from '@/utils/glucose';

interface PredictiveAnalysisProps {
  measurements: GlucoseMeasurement[];
}

interface Prediction {
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  nextValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

export default function PredictiveAnalysis({ measurements }: PredictiveAnalysisProps) {
  const prediction = useMemo(() => {
    return calculatePrediction(measurements);
  }, [measurements]);

  if (measurements.length < 3) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Analyse Prédictive</Text>
        <View style={styles.insufficientData}>
          <AlertTriangle size={32} color="#FFA500" />
          <Text style={styles.insufficientText}>
            Au moins 3 mesures sont nécessaires pour l'analyse prédictive
          </Text>
        </View>
      </View>
    );
  }

  const getTrendIcon = () => {
    switch (prediction.trend) {
      case 'increasing':
        return <TrendingUp size={24} color="#FF6B35" />;
      case 'decreasing':
        return <TrendingDown size={24} color="#00D9FF" />;
      default:
        return <Target size={24} color="#8B5CF6" />;
    }
  };

  const getTrendColor = () => {
    switch (prediction.trend) {
      case 'increasing':
        return ['#FF6B35', '#FF8E53'];
      case 'decreasing':
        return ['#00D9FF', '#46E4FF'];
      default:
        return ['#8B5CF6', '#A78BFA'];
    }
  };

  const getRiskColor = () => {
    switch (prediction.riskLevel) {
      case 'high':
        return '#FF3B82';
      case 'medium':
        return '#FFA500';
      default:
        return '#00D9FF';
    }
  };

  const getTrendText = () => {
    switch (prediction.trend) {
      case 'increasing':
        return 'Tendance à la hausse';
      case 'decreasing':
        return 'Tendance à la baisse';
      default:
        return 'Tendance stable';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analyse Prédictive</Text>
      
      <LinearGradient
        colors={getTrendColor()}
        style={styles.predictionCard}
      >
        <View style={styles.predictionHeader}>
          {getTrendIcon()}
          <View style={styles.predictionInfo}>
            <Text style={styles.trendText}>{getTrendText()}</Text>
            <Text style={styles.confidenceText}>
              Confiance: {(prediction.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.predictionDetails}>
          <View style={styles.nextValueContainer}>
            <Text style={styles.nextValueLabel}>Prochaine valeur estimée</Text>
            <Text style={styles.nextValue}>
              {prediction.nextValue.toFixed(0)} mg/dL
            </Text>
          </View>
          
          <View style={styles.riskContainer}>
            <Text style={styles.riskLabel}>Niveau de risque</Text>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor() + '20' }]}>
              <Text style={[styles.riskText, { color: getRiskColor() }]}>
                {prediction.riskLevel.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.recommendationContainer}>
        <Text style={styles.recommendationTitle}>Recommandation</Text>
        <Text style={styles.recommendationText}>
          {prediction.recommendation}
        </Text>
      </View>
    </View>
  );
}

function calculatePrediction(measurements: GlucoseMeasurement[]): Prediction {
  if (measurements.length < 3) {
    return {
      trend: 'stable',
      confidence: 0,
      nextValue: 0,
      riskLevel: 'low',
      recommendation: 'Données insuffisantes'
    };
  }

  // Prendre les 7 dernières mesures pour l'analyse
  const recentMeasurements = measurements.slice(0, 7).reverse();
  const values = recentMeasurements.map(m => m.value);
  
  // Calcul de la tendance avec régression linéaire simple
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Prédiction de la prochaine valeur
  const nextValue = slope * n + intercept;
  
  // Calcul de la confiance basée sur la variance
  const predictions = x.map(xi => slope * xi + intercept);
  const errors = values.map((val, i) => Math.abs(val - predictions[i]));
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const confidence = Math.max(0, Math.min(1, 1 - meanError / 50));
  
  // Détermination de la tendance
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < 2) {
    trend = 'stable';
  } else if (slope > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }
  
  // Évaluation du risque
  const currentStatus = getGlucoseStatus(values[values.length - 1]);
  const predictedStatus = getGlucoseStatus(nextValue);
  
  let riskLevel: 'low' | 'medium' | 'high';
  if (predictedStatus !== 'normal' || Math.abs(slope) > 10) {
    riskLevel = 'high';
  } else if (currentStatus !== 'normal' || Math.abs(slope) > 5) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Génération de recommandations
  let recommendation: string;
  if (trend === 'increasing' && nextValue > 140) {
    recommendation = 'Surveillez votre alimentation et consultez votre médecin si la tendance persiste.';
  } else if (trend === 'decreasing' && nextValue < 70) {
    recommendation = 'Préparez des glucides rapides et surveillez les signes d\'hypoglycémie.';
  } else if (riskLevel === 'high') {
    recommendation = 'Consultez votre médecin pour ajuster votre traitement.';
  } else if (trend === 'stable') {
    recommendation = 'Continuez vos bonnes habitudes, votre glycémie est stable.';
  } else {
    recommendation = 'Surveillez l\'évolution et maintenez vos habitudes saines.';
  }
  
  return {
    trend,
    confidence,
    nextValue: Math.max(20, Math.min(600, nextValue)),
    riskLevel,
    recommendation
  };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  insufficientData: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  insufficientText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  predictionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  trendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  predictionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextValueContainer: {
    flex: 1,
  },
  nextValueLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  nextValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  riskContainer: {
    alignItems: 'flex-end',
  },
  riskLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
  },
});