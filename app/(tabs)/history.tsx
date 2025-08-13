import React, { useState, useEffect } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, TrendingUp, Trash2 } from 'lucide-react-native';


function HistoryScreen() {
  const { data: measurements = [], isLoading, error } = useMeasurements();
  const deleteMeasurement = useDeleteMeasurement();
  const [filteredMeasurements, setFilteredMeasurements] = useState<GlucoseMeasurement[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');


  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', "Impossible de charger l'historique");
    }
  }, [error]);

  useEffect(() => {
    filterMeasurements();
  }, [measurements, selectedFilter]);


  const filterMeasurements = () => {
    const now = new Date();
    let filtered = measurements;

    switch (selectedFilter) {
      case 'today':
        filtered = measurements.filter(m => {
          const measurementDate = new Date(m.timestamp);
          return measurementDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = measurements.filter(m => new Date(m.timestamp) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = measurements.filter(m => new Date(m.timestamp) >= monthAgo);
        break;
      default:
        filtered = measurements;
    }

    setFilteredMeasurements(filtered);
  };


      'Supprimer la mesure',
      'Êtes-vous sûr de vouloir supprimer cette mesure ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {

            }
          },
        },
      ]
    );
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

  const getStatusText = (value: number) => {
    const status = getGlucoseStatus(value);
    switch (status) {
      case 'low': return 'Bas';
      case 'high': return 'Élevé';
      case 'normal': return 'Normal';
      default: return '';
    }
  };

  const filterOptions = [
    { id: 'all', label: 'Tout' },
    { id: 'today', label: 'Aujourd\'hui' },
    { id: 'week', label: '7 jours' },
    { id: 'month', label: '30 jours' },
  ];


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
        <View style={styles.header}>
          <Text style={styles.title}>Historique</Text>
          <Text style={styles.subtitle}>
            {filteredMeasurements.length} mesure{filteredMeasurements.length > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterButton,
                  selectedFilter === option.id && styles.filterButtonSelected,
                ]}
                onPress={() => setSelectedFilter(option.id as any)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === option.id && styles.filterTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredMeasurements}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={
            <AdvancedChart measurements={filteredMeasurements} period="month" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <TrendingUp size={48} color="#6B7280" />
              <Text style={styles.emptyTitle}>Aucune mesure</Text>
              <Text style={styles.emptySubtitle}>
                Aucune mesure trouvée pour cette période
              </Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonSelected: {
    backgroundColor: '#667EEA',
  },
  filterText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  measurementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  measurementLeft: {
    flex: 1,
  },
  measurementValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  measurementType: {
    fontSize: 14,
    color: '#6B7280',
  },
  measurementRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  measurementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  notesText: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
});

export default HistoryScreen;