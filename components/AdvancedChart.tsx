import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { GlucoseMeasurement } from '@/utils/storage';
import { getGlucoseStatus } from '@/utils/glucose';
import { TrendingUp, ChartBar as BarChart3, ChartPie as PieChartIcon } from 'lucide-react-native';

interface AdvancedChartProps {
  measurements: GlucoseMeasurement[];
  period: 'week' | 'month';
}

type ChartType = 'line' | 'bar' | 'pie';

export default function AdvancedChart({ measurements, period }: AdvancedChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  const getTimeZoneData = () => {
    const zones: Record<'morning' | 'afternoon' | 'evening' | 'night', { label: string; data: number[]; color: string }> = {
      morning: { label: 'Matin (6h-12h)', data: [], color: '#FF9A9E' },
      afternoon: { label: 'Après-midi (12h-18h)', data: [], color: '#FECFEF' },
      evening: { label: 'Soir (18h-22h)', data: [], color: '#A8EDEA' },
      night: { label: 'Nuit (22h-6h)', data: [], color: '#FED6E3' }
    };

    measurements.forEach(m => {
      const hour = new Date(m.timestamp).getHours();
      if (hour >= 6 && hour < 12) zones.morning.data.push(m.value);
      else if (hour >= 12 && hour < 18) zones.afternoon.data.push(m.value);
      else if (hour >= 18 && hour < 22) zones.evening.data.push(m.value);
      else zones.night.data.push(m.value);
    });

    return zones;
  };

  const getStatusDistribution = () => {
    const distribution = { low: 0, normal: 0, high: 0 };
    
    measurements.forEach(m => {
      const status = getGlucoseStatus(m.value);
      distribution[status]++;
    });

    return [
      {
        name: 'Bas',
        population: distribution.low,
        color: '#FF3B82',
        legendFontColor: '#2D3748',
        legendFontSize: 12,
      },
      {
        name: 'Normal',
        population: distribution.normal,
        color: '#00D9FF',
        legendFontColor: '#2D3748',
        legendFontSize: 12,
      },
      {
        name: 'Élevé',
        population: distribution.high,
        color: '#FF6B35',
        legendFontColor: '#2D3748',
        legendFontSize: 12,
      },
    ];
  };

  const getBarChartData = () => {
    const zones = getTimeZoneData();
    const labels = ['Matin', 'A-midi', 'Soir', 'Nuit'];
    const data = Object.values(zones).map(zone => {
      if (zone.data.length === 0) return 0;
      return zone.data.reduce((sum, val) => sum + val, 0) / zone.data.length;
    });

    return {
      labels,
      datasets: [{
        data,
        colors: [
          () => '#FF9A9E',
          () => '#FECFEF', 
          () => '#A8EDEA',
          () => '#FED6E3'
        ]
      }]
    };
  };

  const getLineChartData = () => {
    if (measurements.length === 0) {
      return {
        labels: ['Aucune donnée'],
        datasets: [{ data: [0] }]
      };
    }

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

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart
            data={getLineChartData()}
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
        );
      case 'bar':
        return (
          <BarChart
            data={getBarChartData()}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix=""
            showValuesOnTopOfBars={true}
            fromZero={true}
          />
        );
      case 'pie':
        return (
          <PieChart
            data={getStatusDistribution()}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        );
      default:
        return null;
    }
  };

  const getChartTitle = () => {
    switch (chartType) {
      case 'line':
        return `Évolution - ${period === 'week' ? '7 jours' : '30 jours'}`;
      case 'bar':
        return 'Moyennes par période de la journée';
      case 'pie':
        return 'Répartition des niveaux de glycémie';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getChartTitle()}</Text>
        <View style={styles.chartTypeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, chartType === 'line' && styles.typeButtonActive]}
            onPress={() => setChartType('line')}
          >
            <TrendingUp size={16} color={chartType === 'line' ? '#FFFFFF' : '#667EEA'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, chartType === 'bar' && styles.typeButtonActive]}
            onPress={() => setChartType('bar')}
          >
            <BarChart3 size={16} color={chartType === 'bar' ? '#FFFFFF' : '#667EEA'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, chartType === 'pie' && styles.typeButtonActive]}
            onPress={() => setChartType('pie')}
          >
            <PieChartIcon size={16} color={chartType === 'pie' ? '#FFFFFF' : '#667EEA'} />
          </TouchableOpacity>
        </View>
      </View>

      {measurements.length > 0 ? (
        <View style={styles.chartContainer}>
          {renderChart()}
          
          {chartType === 'line' && (
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
          )}

          {chartType === 'bar' && (
            <View style={styles.timeZoneInfo}>
              <Text style={styles.infoText}>
                Analyse des moyennes glycémiques par période de la journée
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Ajoutez des mesures pour voir les graphiques
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 2,
  },
  typeButton: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  typeButtonActive: {
    backgroundColor: '#667EEA',
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
  timeZoneInfo: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
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