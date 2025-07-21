import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { GlucoseMeasurement } from '@/utils/storage';
import { getGlucoseStatus } from '@/utils/glucose';

interface GlucoseChartProps {
  measurements: GlucoseMeasurement[];
  period: 'week' | 'month';
}

export default function GlucoseChart({ measurements, period }: GlucoseChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  const getChartData = () => {
    if (measurements.length === 0) {
      return {
        labels: ['Aucune donnée'],
        datasets: [{ data: [0] }]
      };
    }

    // Filtrer les données selon la période
    const now = new Date();
    const periodDays = period === 'week' ? 7 : 30;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const filteredMeasurements = measurements
      .filter(m => new Date(m.timestamp) >= startDate)
      .slice(0, period === 'week' ? 14 : 30)
      .reverse();

    if (filteredMeasurements.length === 0) {
      return {
        labels: ['Aucune donnée'],
        datasets: [{ data: [0] }]
      };
    }

    const labels = filteredMeasurements.map(m => {
      const date = new Date(m.timestamp);
      if (period === 'week') {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }
    });

    const data = filteredMeasurements.map(m => m.value);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
        strokeWidth: 3
      }]
    };
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#667EEA'
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1
    }
  };

  const data = getChartData();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Évolution - {period === 'week' ? '7 derniers jours' : '30 derniers jours'}
      </Text>
      
      {measurements.length > 0 ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={data}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            fromZero={false}
            segments={4}
          />
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF3B82' }]} />
              <Text style={styles.legendText}>Bas (&lt;70)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00D9FF' }]} />
              <Text style={styles.legendText}>Normal (70-140)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
              <Text style={styles.legendText}>Élevé (&gt;140)</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Ajoutez des mesures pour voir le graphique
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
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
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});