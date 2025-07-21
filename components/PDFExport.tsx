import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Share } from 'react-native';
import { FileText, Download, Share as ShareIcon } from 'lucide-react-native';
import { GlucoseMeasurement } from '@/utils/storage';
import { calculateStats, getGlucoseStatus } from '@/utils/glucose';

interface PDFExportProps {
  measurements: GlucoseMeasurement[];
}

export default function PDFExport({ measurements }: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDFContent = () => {
    const stats = calculateStats(measurements);
    const now = new Date();
    
    // Grouper les mesures par date
    const measurementsByDate = measurements.reduce((groups, measurement) => {
      const date = new Date(measurement.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(measurement);
      return groups;
    }, {} as { [date: string]: GlucoseMeasurement[] });

    // Calculer les statistiques par statut
    const statusCounts = measurements.reduce((counts, m) => {
      const status = getGlucoseStatus(m.value);
      counts[status]++;
      return counts;
    }, { low: 0, normal: 0, high: 0 });

    const content = `
RAPPORT DE SUIVI GLYCÉMIQUE
Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}

═══════════════════════════════════════════════════════════════

RÉSUMÉ STATISTIQUE

Période d'analyse: ${measurements.length > 0 ? 
  `Du ${new Date(measurements[measurements.length - 1].timestamp).toLocaleDateString('fr-FR')} au ${new Date(measurements[0].timestamp).toLocaleDateString('fr-FR')}` : 
  'Aucune donnée'
}

Nombre total de mesures: ${stats.count}
Glycémie moyenne: ${stats.average.toFixed(1)} mg/dL
Glycémie minimale: ${stats.min} mg/dL
Glycémie maximale: ${stats.max} mg/dL

RÉPARTITION PAR NIVEAU:
• Hypoglycémie (< 70 mg/dL): ${statusCounts.low} mesures (${((statusCounts.low / stats.count) * 100).toFixed(1)}%)
• Normal (70-140 mg/dL): ${statusCounts.normal} mesures (${((statusCounts.normal / stats.count) * 100).toFixed(1)}%)
• Hyperglycémie (> 140 mg/dL): ${statusCounts.high} mesures (${((statusCounts.high / stats.count) * 100).toFixed(1)}%)

═══════════════════════════════════════════════════════════════

DÉTAIL DES MESURES

${Object.entries(measurementsByDate)
  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
  .map(([date, dayMeasurements]) => {
    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return `${formattedDate.toUpperCase()}
${dayMeasurements
  .sort((a, b) => b.timestamp - a.timestamp)
  .map(m => {
    const time = new Date(m.timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const status = getGlucoseStatus(m.value);
    const statusText = status === 'low' ? '[BAS]' : status === 'high' ? '[ÉLEVÉ]' : '[NORMAL]';
    const notes = m.notes ? ` - ${m.notes}` : '';
    
    return `  ${time} | ${m.value} mg/dL ${statusText} | ${m.type}${notes}`;
  }).join('\n')}`;
  }).join('\n\n')}

═══════════════════════════════════════════════════════════════

RECOMMANDATIONS GÉNÉRALES

${getRecommendations(stats, statusCounts)}

═══════════════════════════════════════════════════════════════

Ce rapport a été généré automatiquement par l'application de suivi glycémique.
Pour toute question médicale, consultez votre professionnel de santé.

Données exportées: ${measurements.length} mesures
Date d'export: ${now.toLocaleString('fr-FR')}
    `.trim();

    return content;
  };

  const handleExport = async () => {
    if (measurements.length === 0) {
      Alert.alert('Aucune donnée', 'Aucune mesure à exporter');
      return;
    }

    setIsGenerating(true);
    
    try {
      const content = generatePDFContent();
      
      if (Platform.OS === 'web') {
        // Pour le web, créer un fichier texte téléchargeable
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport-glycemie-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Succès', 'Rapport exporté avec succès');
      } else {
        // Pour mobile, utiliser le partage natif
        await Share.share({
          message: content,
          title: 'Rapport de suivi glycémique'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le rapport');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FileText size={20} color="#667EEA" />
        <Text style={styles.title}>Export PDF/Rapport</Text>
      </View>
      
      <Text style={styles.description}>
        Générez un rapport détaillé de vos mesures glycémiques pour vos consultations médicales.
      </Text>
      
      <View style={styles.statsPreview}>
        <Text style={styles.statsTitle}>Aperçu du rapport:</Text>
        <Text style={styles.statsText}>• {measurements.length} mesures</Text>
        <Text style={styles.statsText}>• Période: {measurements.length > 0 ? 
          `${Math.ceil((Date.now() - measurements[measurements.length - 1].timestamp) / (1000 * 60 * 60 * 24))} jours` : 
          'Aucune donnée'
        }</Text>
        <Text style={styles.statsText}>• Format: Texte structuré</Text>
      </View>

      <TouchableOpacity
        style={[styles.exportButton, isGenerating && styles.exportButtonDisabled]}
        onPress={handleExport}
        disabled={isGenerating || measurements.length === 0}
      >
        {Platform.OS === 'web' ? (
          <Download size={20} color="#FFFFFF" />
        ) : (
          <ShareIcon size={20} color="#FFFFFF" />
        )}
        <Text style={styles.exportButtonText}>
          {isGenerating ? 'Génération...' : 
           Platform.OS === 'web' ? 'Télécharger le rapport' : 'Partager le rapport'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.disclaimer}>
        ⚠️ Ce rapport est à des fins informatives uniquement. Consultez votre médecin pour l'interprétation médicale.
      </Text>
    </View>
  );
}

function getRecommendations(stats: any, statusCounts: any): string {
  const recommendations = [];
  
  if (stats.count === 0) {
    return 'Aucune donnée disponible pour générer des recommandations.';
  }
  
  const lowPercentage = (statusCounts.low / stats.count) * 100;
  const highPercentage = (statusCounts.high / stats.count) * 100;
  const normalPercentage = (statusCounts.normal / stats.count) * 100;
  
  if (normalPercentage >= 70) {
    recommendations.push('✓ Excellent contrôle glycémique avec 70%+ de mesures dans la cible.');
  } else if (normalPercentage >= 50) {
    recommendations.push('• Bon contrôle glycémique, continuez vos efforts.');
  } else {
    recommendations.push('⚠ Contrôle glycémique à améliorer - moins de 50% dans la cible.');
  }
  
  if (lowPercentage > 10) {
    recommendations.push('⚠ Attention: Fréquence élevée d\'hypoglycémies. Consultez votre médecin.');
  }
  
  if (highPercentage > 25) {
    recommendations.push('⚠ Attention: Fréquence élevée d\'hyperglycémies. Révisez votre traitement.');
  }
  
  if (stats.average > 150) {
    recommendations.push('• Moyenne glycémique élevée. Surveillez votre alimentation et activité physique.');
  } else if (stats.average < 80) {
    recommendations.push('• Moyenne glycémique basse. Attention aux hypoglycémies.');
  }
  
  recommendations.push('• Continuez le suivi régulier de votre glycémie.');
  recommendations.push('• Partagez ce rapport avec votre équipe médicale.');
  
  return recommendations.join('\n');
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
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsPreview: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 2,
  },
  exportButton: {
    backgroundColor: '#667EEA',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  exportButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 11,
    color: '#F56565',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});