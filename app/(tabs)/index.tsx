import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, Activity, Sparkles, ChartBar as BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StorageManager } from '@/utils/storageManager';
import { GlucoseMeasurement } from '@/utils/storage';
import { getGlucoseStatus, calculateStats, filterMeasurementsByDateRange } from '@/utils/glucose';
import { useSettings } from '@/contexts/SettingsContext';
import AdvancedChart from '@/components/AdvancedChart';
import PredictiveAnalysis from '@/components/PredictiveAnalysis';
import ComparisonAnalysis from '@/components/ComparisonAnalysis';
import PDFExport from '@/components/PDFExport';
import StatsCards from '@/components/StatsCards';

function HomeScreen() {
  const { t } = useTranslation();
  const { userSettings } = useSettings();
  const [measurements, setMeasurements] = useState<GlucoseMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    try {
      const data = await StorageManager.getMeasurements();
      setMeasurements(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les mesures');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMeasurements();
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
    if (diff > 0) return <TrendingUp size={20} color="#FF6B35" />;
    if (diff < 0) return <TrendingDown size={20} color="#00D9FF" />;
    return <Activity size={20} color="#8B5CF6" />;
  };

  const getStatusColor = (value: number) => {
    const status = getGlucoseStatus(value);
    switch (status) {
      case 'low': return '#FF3B82';
      case 'high': return '#FF6B35';
      case 'normal': return '#00D9FF';
      default: return '#8B5CF6';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2', '#F093FB']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{t('home.title')}</Text>
            <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          </View>

          {latestMeasurement ? (
            <View style={styles.currentCard}>
              <View style={styles.currentHeader}>
                <Text style={styles.currentLabel}>{t('home.lastMeasurement')}</Text>
                {getTrendIcon()}
              </View>
              <View style={styles.currentValueContainer}>
                <Text style={[styles.currentValue, { color: getStatusColor(latestMeasurement.value) }]}>
                  {latestMeasurement.value}
                </Text>
                <Text style={styles.currentUnit}>{unitLabel}</Text>
              </View>
              <Text style={styles.currentTime}>
                {new Date(latestMeasurement.timestamp).toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.currentType}>
                {latestMeasurement.type}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <LinearGradient
                colors={['#FF9A9E', '#FECFEF']}
                style={styles.emptyIconContainer}
              >
                <AlertTriangle size={48} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{t('home.noMeasurements')}</Text>
              <Text style={styles.emptySubtitle}>
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
                <BarChart3 size={20} color="#FFFFFF" />
                <Text style={styles.chartTitle}>{t('home.chart')}</Text>
              </View>
              <View style={styles.periodSelector}>
                <TouchableOpacity
                  style={[styles.periodButton, chartPeriod === 'week' && styles.periodButtonActive]}
                  onPress={() => setChartPeriod('week')}
                >
                  <Text style={[styles.periodText, chartPeriod === 'week' && styles.periodTextActive]}>
                    {t('home.days7')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodButton, chartPeriod === 'month' && styles.periodButtonActive]}
                  onPress={() => setChartPeriod('month')}
                >
                  <Text style={[styles.periodText, chartPeriod === 'month' && styles.periodTextActive]}>
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

          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>{t('home.recentMeasurements')}</Text>
            {measurements.slice(0, 5).map((measurement, index) => (
              <View key={measurement.id} style={styles.recentItem}>
                <View style={styles.recentLeft}>
                  <Text style={[styles.recentValue, { color: getStatusColor(measurement.value) }]}>
                    {measurement.value} mg/dL
                  </Text>
                  <Text style={styles.recentType}>{measurement.type}</Text>
                </View>
                <Text style={styles.recentTime}>
                  {new Date(measurement.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667EEA',
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
    color: '#6B7280',
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
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  currentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: '#6B7280',
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
    color: '#6B7280',
  },
  currentTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentType: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: '#2D3748',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#718096',
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
    color: '#FFFFFF',
    marginLeft: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  periodText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#667EEA',
  },
  recentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: '#2D3748',
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#718096',
  },
  recentTime: {
    fontSize: 14,
    color: '#718096',
  },
});

export default HomeScreen;