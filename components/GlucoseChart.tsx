import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { GlucoseMeasurement } from '@/utils/storage';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/theme';
import { useHighContrast, useLargeText, getHighContrastStyles, getLargeTextStyles } from '@/utils/accessibility';


interface GlucoseChartProps {
  measurements: GlucoseMeasurement[];
  period: 'week' | 'month';
}

export default function GlucoseChart({ measurements, period }: GlucoseChartProps) {
  const { userSettings } = useSettings();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const highContrast = useHighContrast();
  const largeText = useLargeText();
  
  // Obtenir les valeurs cibles de l'utilisateur
  const targetMin = parseFloat(userSettings.targetMin) || 70;
  const targetMax = parseFloat(userSettings.targetMax) || 140;

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
        color: (opacity = 1) => hexToRgba(colors.primary, opacity),
        strokeWidth: 3
      }]
    };
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => hexToRgba(colors.primary, opacity),
    labelColor: (opacity = 1) => hexToRgba(colors.muted, opacity),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1
    }
  };

  const data = getChartData();

  return (
    <View style={[styles.container, getHighContrastStyles(highContrast)]}>
      <Text
        style={[
          styles.title,
          getHighContrastStyles(highContrast),
          getLargeTextStyles(largeText, 18),
        ]}
      >
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

            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyText,
              getHighContrastStyles(highContrast),
              getLargeTextStyles(largeText, 14),
            ]}
          >
            Ajoutez des mesures pour voir le graphique
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
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
      color: colors.text,
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
      color: colors.muted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 14,
      color: colors.placeholder,
      textAlign: 'center',
    },
  });

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};