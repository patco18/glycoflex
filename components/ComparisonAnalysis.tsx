import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { GlucoseMeasurement } from '@/utils/storage';
import { calculateStats, GlucoseStats } from '@/utils/glucose';

interface ComparisonAnalysisProps {
  measurements: GlucoseMeasurement[];
}

type ComparisonPeriod = 'week' | 'month';

export default function ComparisonAnalysis({ measurements }: ComparisonAnalysisProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ComparisonPeriod>('week');

  const getComparisonData = () => {
    const now = new Date();
    const periodDays = selectedPeriod === 'week' ? 7 : 30;
    
    // Période actuelle
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const currentPeriodMeasurements = measurements.filter(m => 
      new Date(m.timestamp) >= currentStart
    );
    
    // Période précédente
    const previousStart = new Date(now.getTime() - (periodDays * 2) * 24 * 60 * 60 * 1000);
    const previousEnd = currentStart;
    const previousPeriodMeasurements = measurements.filter(m => {
      const date = new Date(m.timestamp);
      return date >= previousStart && date < previousEnd;
    });

    return {
      current: {
        stats: calculateStats(currentPeriodMeasurements),
        measurements: currentPeriodMeasurements,
        label: selectedPeriod === 'week' ? 'Cette semaine' : 'Ce mois'
      },
      previous: {
        stats: calculateStats(previousPeriodMeasurements),
        measurements: previousPeriodMeasurements,
        label: selectedPeriod === 'week' ? 'Semaine précédente' : 'Mois précédent'
      }
    };
  };

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return { icon: <Minus size={16} color="#6B7280" />, color: '#6B7280', text: 'N/A' };
    
    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(change);
    
    if (absChange < 1) {
      return { 
        icon: <Minus size={16} color="#6B7280" />, 
        color: '#6B7280', 
        text: 'Stable' 
      };
    } else if (change > 0) {
      return { 
        icon: <TrendingUp size={16} color="#FF6B35" />, 
        color: '#FF6B35', 
        text: `+${change.toFixed(1)}%` 
      };
    } else {
      return { 
        icon: <TrendingDown size={16} color="#00D9FF" />, 
        color: '#00D9FF', 
        text: `${change.toFixed(1)}%` 
      };
    }
  };

  const data = getComparisonData();

  const ComparisonCard = ({ 
    title, 
    currentValue, 
    previousValue, 
    unit = 'mg/dL' 
  }: { 
    title: string; 
    currentValue: number; 
    previousValue: number; 
    unit?: string; 
  }) => {
    const indicator = getChangeIndicator(currentValue, previousValue);
    
    return (
      <View style={styles.comparisonCard}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.cardContent}>
          <View style={styles.valueContainer}>
            <Text style={styles.currentValue}>
              {currentValue.toFixed(1)} {unit}
            </Text>
            <Text style={styles.previousValue}>
              vs {previousValue.toFixed(1)} {unit}
            </Text>
          </View>
          <View style={[styles.changeIndicator, { backgroundColor: indicator.color + '20' }]}>
            {indicator.icon}
            <Text style={[styles.changeText, { color: indicator.color }]}>
              {indicator.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (measurements.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Analyse Comparative</Text>
        <View style={styles.insufficientData}>
          <Calendar size={32} color="#FFA500" />
          <Text style={styles.insufficientText}>
            Plus de données nécessaires pour la comparaison
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analyse Comparative</Text>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
              Semaines
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
              Mois
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.periodLabels}>
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.periodLabel}
        >
          <Text style={styles.periodLabelText}>{data.current.label}</Text>
          <Text style={styles.periodCount}>{data.current.measurements.length} mesures</Text>
        </LinearGradient>
        
        <LinearGradient
          colors={['#A8EDEA', '#FED6E3']}
          style={styles.periodLabel}
        >
          <Text style={styles.periodLabelText}>{data.previous.label}</Text>
          <Text style={styles.periodCount}>{data.previous.measurements.length} mesures</Text>
        </LinearGradient>
      </View>

      <View style={styles.comparisonGrid}>
        <ComparisonCard
          title="Moyenne"
          currentValue={data.current.stats.average}
          previousValue={data.previous.stats.average}
        />
        
        <ComparisonCard
          title="Minimum"
          currentValue={data.current.stats.min}
          previousValue={data.previous.stats.min}
        />
        
        <ComparisonCard
          title="Maximum"
          currentValue={data.current.stats.max}
          previousValue={data.previous.stats.max}
        />
        
        <ComparisonCard
          title="Nombre de mesures"
          currentValue={data.current.stats.count}
          previousValue={data.previous.stats.count}
          unit="mesures"
        />
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Résumé</Text>
        <Text style={styles.summaryText}>
          {getSummaryText(data.current.stats, data.previous.stats, selectedPeriod)}
        </Text>
      </View>
    </View>
  );
}

function getSummaryText(current: GlucoseStats, previous: GlucoseStats, period: ComparisonPeriod): string {
  if (previous.count === 0) {
    return `Première période d'analyse. Continuez à enregistrer vos mesures pour voir l'évolution.`;
  }

  const avgChange = ((current.average - previous.average) / previous.average) * 100;
  const periodText = period === 'week' ? 'semaine' : 'mois';
  
  if (Math.abs(avgChange) < 2) {
    return `Votre glycémie moyenne est restée stable par rapport à la ${periodText} précédente. Continuez vos bonnes habitudes !`;
  } else if (avgChange > 0) {
    return `Votre glycémie moyenne a augmenté de ${avgChange.toFixed(1)}% par rapport à la ${periodText} précédente. Surveillez votre alimentation et consultez votre médecin si nécessaire.`;
  } else {
    return `Votre glycémie moyenne a diminué de ${Math.abs(avgChange).toFixed(1)}% par rapport à la ${periodText} précédente. C'est une amélioration positive !`;
  }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#667EEA',
  },
  periodText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#FFFFFF',
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
  periodLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  periodLabel: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  periodLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  periodCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  comparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comparisonCard: {
    width: '48%',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueContainer: {
    flex: 1,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 2,
  },
  previousValue: {
    fontSize: 10,
    color: '#6B7280',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  summaryContainer: {
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    padding: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
  },
});