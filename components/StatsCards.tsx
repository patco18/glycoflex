import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react-native';
import { GlucoseStats } from '@/utils/glucose';
import { useSettings } from '@/contexts/SettingsContext';

interface StatsCardsProps {
  stats: GlucoseStats;
  trend?: 'up' | 'down' | 'stable';
  timeInRange?: number;
}

export default function StatsCards({ stats, trend, timeInRange }: StatsCardsProps) {
  const { userSettings } = useSettings();
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={20} color="#FFFFFF" />;
      case 'down':
        return <TrendingDown size={20} color="#FFFFFF" />;
      default:
        return <Activity size={20} color="#FFFFFF" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return ['#FF6B35', '#FF8E53'] as const;
      case 'down':
        return ['#00D9FF', '#46E4FF'] as const;
      default:
        return ['#8B5CF6', '#A78BFA'] as const;
    }
  };

  const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <LinearGradient
          colors={['#A8EDEA', '#FED6E3']}
          style={styles.card}
        >
          <Text style={styles.cardValue}>{stats.average.toFixed(1)}</Text>
          <Text style={styles.cardLabel}>Moyenne</Text>
          <Text style={styles.cardUnit}>{unitLabel}</Text>
        </LinearGradient>

        <LinearGradient
          colors={getTrendColor()}
          style={styles.card}
        >
          <View style={styles.trendHeader}>
            {getTrendIcon()}
            <Text style={styles.cardValue}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
              {Math.abs(stats.max - stats.min)}
            </Text>
          </View>
          <Text style={styles.cardLabel}>Tendance</Text>
          <Text style={styles.cardUnit}>7 jours</Text>
        </LinearGradient>
      </View>

      <View style={styles.row}>
        <LinearGradient
          colors={['#FFD3A5', '#FD9853']}
          style={styles.card}
        >
          <Text style={styles.cardValue}>{stats.min}</Text>
          <Text style={styles.cardLabel}>Minimum</Text>
          <Text style={styles.cardUnit}>{unitLabel}</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#A8CABA', '#5D4E75']}
          style={styles.card}
        >
          <Text style={styles.cardValue}>{stats.max}</Text>
          <Text style={styles.cardLabel}>Maximum</Text>
          <Text style={styles.cardUnit}>{unitLabel}</Text>
        </LinearGradient>
      </View>

      {timeInRange !== undefined && (
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.fullCard}
        >
          <View style={styles.timeInRangeHeader}>
            <Target size={24} color="#FFFFFF" />
            <Text style={styles.timeInRangeValue}>{timeInRange.toFixed(1)}%</Text>
          </View>
          <Text style={styles.timeInRangeLabel}>Temps dans la cible</Text>
          <Text style={styles.timeInRangeDescription}>
            Pourcentage de mesures dans la plage normale ({userSettings.targetMin}-{userSettings.targetMax} {unitLabel})
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardUnit: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  timeInRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInRangeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  timeInRangeLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  timeInRangeDescription: {
    fontSize: 12,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 16,
  },
});