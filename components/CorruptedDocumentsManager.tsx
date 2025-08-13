import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { getCorruptedDocuments, deleteProblematicDocument } from '@/utils/cleanupTools';

/**
 * Composant pour afficher et gérer les documents corrompus
 */
export default function CorruptedDocumentsManager() {
  const [corruptedDocs, setCorruptedDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadCorruptedDocuments();
  }, []);

  const loadCorruptedDocuments = async () => {
    setLoading(true);
    try {
      const docs = await getCorruptedDocuments();
      setCorruptedDocs(docs);
    } catch (error) {
      console.error('Erreur lors du chargement des documents corrompus:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger la liste des documents corrompus'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    Alert.alert(
      'Confirmation',
      `Êtes-vous sûr de vouloir supprimer définitivement le document ${docId} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(docId);
            try {
              await deleteProblematicDocument(docId);
              setCorruptedDocs(corruptedDocs.filter(id => id !== docId));
              Alert.alert('Succès', 'Document supprimé avec succès');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le document');
            } finally {
              setDeleting(null);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.documentItem}>
      <Text style={styles.documentId} numberOfLines={1} ellipsizeMode="middle">
        {item}
      </Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteDocument(item)}
        disabled={deleting === item}
      >
        {deleting === item ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents Corrompus</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadCorruptedDocuments}>
          <Text style={styles.refreshButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667EEA" />
          <Text style={styles.loadingText}>Chargement des documents...</Text>
        </View>
      ) : corruptedDocs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun document corrompu détecté</Text>
        </View>
      ) : (
        <FlatList
          data={corruptedDocs}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Total: {corruptedDocs.length} document(s) corrompu(s)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  refreshButton: {
    backgroundColor: '#4299E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentId: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#F56565',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
});
