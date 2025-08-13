import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, Activity, Sparkles, ChartBar as BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getGlucoseStatus, calculateStats } from '@/utils/glucose';
import { useSettings } from '@/contexts/SettingsContext';
import { useHighContrast, useLargeText, getHighContrastStyles, getLargeTextStyles } from '@/utils/accessibility';
import AdvancedChart from '@/components/AdvancedChart';
import PredictiveAnalysis from '@/components/PredictiveAnalysis';
import ComparisonAnalysis from '@/components/ComparisonAnalysis';
import PDFExport from '@/components/PDFExport';
import StatsCards from '@/components/StatsCards';
import { useMeasurements } from '@/hooks/useMeasurements';


function HomeScreen() {
  const { t } = useTranslation();
  const { userSettings } = useSettings();

  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const toast = useToast();

  useEffect(() => {

    }
  }, [error]);

  const onRefresh = () => {
    refetch();
  };

  const calculateTimeInRange = () => {
    if (measurements.length === 0) return 0;
    const inRange = measurements.filter(m => {
      const status = getGlucoseStatus(m.value);
      return status === 'normal';
    }).length;
    return (inRange / measurements.length) * 100;
  };

  const calculateTrend = () => {
    if (measurements.length < 2) return 'stable';
    
    const recent = measurements.slice(0, 3);
    const older = measurements.slice(3, 6);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    if (diff > 10) return 'up';
    if (diff < -10) return 'down';
    return 'stable';
  };

  const stats = calculateStats(measurements);
  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];
  const timeInRange = calculateTimeInRange();
  const trend = calculateTrend();

  const unitLabel = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';

  const getTrendIcon = () => {
    if (!latestMeasurement || !previousMeasurement) return null;
    
    const diff = latestMeasurement.value - previousMeasurement.value;
    if (diff > 0) return <TrendingUp size={20} color={colors.warning} />;
    if (diff < 0) return <TrendingDown size={20} color={colors.secondary} />;
    return <Activity size={20} color={colors.accent} />;
  };

  const getStatusColor = (value: number) => {
    const status = getGlucoseStatus(value);
    switch (status) {
      case 'low': return colors.danger;
      case 'high': return colors.warning;
      case 'normal': return colors.secondary;
      default: return colors.accent;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, getHighContrastStyles(highContrast)]}>
        <View style={styles.loadingContainer}>
          <Text
            style={[
              styles.loadingText,
              getHighContrastStyles(highContrast),
              getLargeTextStyles(largeText, 18),
            ]}
          >
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, getHighContrastStyles(highContrast)]}>
      <LinearGradient

        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={32} color={colors.white} />
            </View>
            <Text
              style={[
                styles.title,
                getHighContrastStyles(highContrast),
                getLargeTextStyles(largeText, 28),
              ]}
            >
              {t('home.title')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                getHighContrastStyles(highContrast),
                getLargeTextStyles(largeText, 16),
              ]}
            >
              {t('home.subtitle')}
            </Text>
          </View>

          {latestMeasurement ? (
            <View style={[styles.currentCard, getHighContrastStyles(highContrast)]}>
              <View style={styles.currentHeader}>
                <Text
                  style={[
                    styles.currentLabel,
                    getHighContrastStyles(highContrast),
                    getLargeTextStyles(largeText, 14),
                  ]}
                >
                  {t('home.lastMeasurement')}
                </Text>
                {getTrendIcon()}
              </View>
              <View style={styles.currentValueContainer}>

                  {latestMeasurement.value}
                </Text>
                <Text
                  style={[
                    styles.currentUnit,
                    getHighContrastStyles(highContrast),
                    getLargeTextStyles(largeText, 18),
                  ]}
                >
                  {unitLabel}
                </Text>
              </View>
              <Text
                style={[
                  styles.currentTime,
                  getHighContrastStyles(highContrast),
                  getLargeTextStyles(largeText, 14),
                ]}
              >
                {new Date(latestMeasurement.timestamp).toLocaleString('fr-FR')}
              </Text>
              <Text
                style={[
                  styles.currentType,
                  getHighContrastStyles(highContrast),
                  getLargeTextStyles(largeText, 14),
                ]}
              >
                {latestMeasurement.type}
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyCard, getHighContrastStyles(highContrast)]}>
              <LinearGradient

                style={styles.emptyIconContainer}
              >
                <AlertTriangle size={48} color={colors.white} />
              </LinearGradient>
              <Text
                style={[
                  styles.emptyTitle,
                  getHighContrastStyles(highContrast),
                  getLargeTextStyles(largeText, 18),
                ]}
              >
                {t('home.noMeasurements')}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  getHighContrastStyles(highContrast),
                  getLargeTextStyles(largeText, 14),
                ]}
              >
                {t('home.addFirstMeasurement')}
              </Text>
            </View>
          )}

          <StatsCards 
            stats={stats} 
            trend={trend}
            timeInRange={timeInRange}
          />

          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>

              </View>
              <View style={[styles.periodSelector, getHighContrastStyles(highContrast)]}>
                <TouchableOpacity
                  style={[styles.periodButton, chartPeriod === 'week' && styles.periodButtonActive]}
                  onPress={() => setChartPeriod('week')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      chartPeriod === 'week' && styles.periodTextActive,
                      getHighContrastStyles(highContrast),
                      getLargeTextStyles(largeText, 12),
                    ]}
                  >
                    {t('home.days7')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodButton, chartPeriod === 'month' && styles.periodButtonActive]}
                  onPress={() => setChartPeriod('month')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      chartPeriod === 'month' && styles.periodTextActive,
                      getHighContrastStyles(highContrast),
                      getLargeTextStyles(largeText, 12),
                    ]}
                  >
                    {t('home.days30')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <AdvancedChart measurements={measurements} period={chartPeriod} />

          <PredictiveAnalysis measurements={measurements} />

          <ComparisonAnalysis measurements={measurements} />

          <PDFExport measurements={measurements} />

          <View style={[styles.recentContainer, getHighContrastStyles(highContrast)]}>
            <Text
              style={[
                styles.recentTitle,
                getHighContrastStyles(highContrast),
                getLargeTextStyles(largeText, 18),
              ]}
            >
              {t('home.recentMeasurements')}
            </Text>
            {measurements.slice(0, 5).map((measurement, index) => (
              <View key={measurement.id} style={styles.recentItem}>
                <View style={styles.recentLeft}>

                    {measurement.value} mg/dL
                  </Text>
                  <Text
                    style={[
                      styles.recentType,
                      getHighContrastStyles(highContrast),
                      getLargeTextStyles(largeText, 12),
                    ]}
                  >
                    {measurement.type}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.recentTime,
                    getHighContrastStyles(highContrast),
                    getLargeTextStyles(largeText, 14),
                  ]}
                >
                  {new Date(measurement.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    gradient: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 18,
      color: colors.muted,
    },
    header: {
      paddingTop: 16,
      paddingBottom: 24,
      alignItems: 'center',
    },
    headerIcon: {
      marginBottom: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.white,
      marginBottom: 4,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.subtitle,
      textAlign: 'center',
    },
    currentCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    currentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    currentLabel: {
      fontSize: 14,
      color: colors.muted,
      fontWeight: '500',
    },
    currentValueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 8,
    },
    currentValue: {
      fontSize: 48,
      fontWeight: 'bold',
      marginRight: 8,
    },
    currentUnit: {
      fontSize: 18,
      color: colors.muted,
    },
    currentTime: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 4,
    },
    currentType: {
      fontSize: 14,
      color: colors.info,
      fontWeight: '500',
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.muted2,
      textAlign: 'center',
    },
    chartSection: {
      marginBottom: 16,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    chartTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.white,
      marginLeft: 8,
    },
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: colors.overlayLight,
      borderRadius: 8,
      padding: 2,
    },
    periodButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    periodButtonActive: {
      backgroundColor: colors.overlayStrong,
    },
    periodText: {
      fontSize: 12,
      color: colors.white,
      fontWeight: '500',
    },
    periodTextActive: {
      color: colors.primary,
    },
    recentContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    recentTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    recentItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    recentLeft: {
      flex: 1,
    },
    recentValue: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    recentType: {
      fontSize: 12,
      color: colors.muted2,
    },
    recentTime: {
      fontSize: 14,
      color: colors.muted2,
    },
  });

export default HomeScreen;