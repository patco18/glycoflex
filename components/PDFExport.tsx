import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Share } from 'react-native';
import { FileText, Download, Share as ShareIcon } from 'lucide-react-native';
import { GlucoseMeasurement } from '@/utils/storage';
import { calculateStats, getGlucoseStatus } from '@/utils/glucose';
import { useSettings } from '@/contexts/SettingsContext';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useToast } from '@/hooks/useToast';

interface PDFExportProps {
  measurements: GlucoseMeasurement[];
}

export default function PDFExport({ measurements }: PDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { userSettings } = useSettings();
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const toast = useToast();

  // Charger le logo au format base64 pour l'inclure dans le PDF
  useEffect(() => {
    const loadLogo = async () => {
      try {
        if (Platform.OS === 'web') {
          // Pour le web, utiliser une URL relative à l'application
          setLogoUri('/assets/images/icon.png');
        } else {
          // Pour mobile, utiliser un logo encodé en base64 directement
          // Utilisez un logo intégré en base64 pour éviter les problèmes de lecture de fichier
          // Ceci est une solution temporaire - en production, vous pourriez vouloir précharger l'asset correctement
          const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE8UlEQVR4nO2aW2xURRjHf9PdQtGmCgVR5Ga8VINWlLZYQdSAQPFSo/EB0ETjC2rUxEQTnzTGd9/0xTdtQogEL0SCGi+JgVgNKAHcchG00FoKlXazpd3tdr9xzpnD2e7u6XbP2UW6/2Sy2XO+y8z/m/lmzpwtlClTpkyZMmXK5ClK0PJzgQeAW4GZwGRgElCZb/MrsA/YBnwHHAuYQ0kxAVgDfAWcBLwBPF3A+8BLwBdAJn8t07+rFtCnBASBaUAHkKL4wdK6HegtgfucgvO0TLf9ynRL3xk/uVL3g2/DdXuA+cDH/o+Wj5sqDnQAdoiG46Z/ycyWjaInoEm00f4OCUKxUTRbDboIQp+iJU2M/aDGAB8BO9HLHnjFKMUDKgJo0wG2APOALwO0P2I48DHwCHA4CGOKYSj+DlC8JHzyQ3hAMXoDvFlKh+lCaRoW+jVEscsC4FngTr+GDB8aQ+S+0ZP3IcBFKbRWHCRDxR0+6o4BFwclu+SXAeGAHxODcaxYxrPdimXFMlq+LPo2MBZ4H3grAIG7gXVBCA6KCzG+BLKU9WoDjxsUFm+fANfogkwZ2NmqOpt1/FGhtLHc9FWlH/Y1//pKLGuxJGP1xqus/TCKI12ge0VyrgPGSYYWeCCQkJOysAYosvSOLG5TYL+XL45ARqmyR4S5P6WMbXsUx2JaRILuL69lfCLKc+1JniKmK9eFyQF62+8V9lPfmtPkCO3nm3RlozE+asQHCr1TlpNCr76+PUXn2U5a85WLnBCP7T/Mb5akKAnzUKw+cJRnrCRrU11sN5Vhj8h94EnDzG2mdLda6TUOxdLOA7wYchmbwshVxcZEF89kU3TpypA7YGd+JCaj6BB6Gh2KJYcP8nxdcMOmGAYrTvSMs6ZXHBByiKw0JB5xDnB+gmevCLA1JZn2SiHLgQVjyukifWJ8eZCh2HLwEJ+EFLUOxb8yl9M3FqUYqIIIkVNC3jRjvBUCQhhbblHMThznsSBJ5mBepZg+IcrdDsMnz7G36UuEGNI7roiBKz3aPlVvxhetkYwsZngrBI4ZimMJm7srmw5wu1umJ8ZH3acIhdDmmwJG3ZDMrDFSGzz6ujH6azr1uZ6twQ1mjaQzoqhJnuU+p5/nkl20uQx7xQYXxRYhPtIwmFdDTy/trk2LbmL1unK30HjWQTHb6eY5K8ltbs/zal0WFDoMC7MhsE0MVqNDsazvKC9ElNZ+ucYz8SJrF4aTwqBB/3ZTvDMxn+STauJvQqY9KE9QGGtpIzWscyieTHbRLjPvBZ8NEm+L5zbhwafc2vQsJ1KMFcMb9Wj1OBRPuF201cfgXuxvN96I6flM7jdzO9g1s85RA/8vy0sKY2kiOcYay6bVHdvHZlu/uf2TISdkfSE8Kgw9ImSMF3beIvIG2mH3OMaTVLgUa61+PijWaC8OF4RRnXqaapPjrE518WIxk9UrJl2QHcxlwnAJQlR/bG7Sr1T8oK9+0KdiyZUjRn0uIRsNi1UhHacbhEFJ6ZHcvO73OgU8YhhYHZK4SpH3vBD0bkCSfhlQGhFIuALU6WnUEbCwoHkY+EXE3afbfQf0ltAJVmldB3yk9cSdsG2Aa4HntISV+kOJ7MlxHXCjtN8FPK3FDapRimfFU4HPtG4OmlwQaMXDfrffa79yaEVdbSj+C2Kxg5dE9WI1AAAAAElFTkSuQmCC';
          setLogoUri(`data:image/png;base64,${logoBase64}`);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du logo:', error);
      }
    };

    loadLogo();
  }, []);

  const generatePDFContent = () => {
    const stats = calculateStats(measurements, parseFloat(userSettings.targetMin), parseFloat(userSettings.targetMax));
    const now = new Date();
    const unit = userSettings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L';
    
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
      const status = getGlucoseStatus(m.value, parseFloat(userSettings.targetMin), parseFloat(userSettings.targetMax));
      counts[status]++;
      return counts;
    }, { low: 0, normal: 0, high: 0 });

    // Construire le contenu du profil utilisateur
    const profileInfo = `
INFORMATIONS PATIENT
Nom: ${userSettings.name || 'Non spécifié'}
Âge: ${userSettings.age || 'Non spécifié'}
${userSettings.gender ? `Genre: ${userSettings.gender}` : ''}
${userSettings.height ? `Taille: ${userSettings.height} cm` : ''}
${userSettings.weight ? `Poids: ${userSettings.weight} kg` : ''}
${userSettings.medicalId ? `Numéro Sécu: ${userSettings.medicalId}` : ''}
${userSettings.doctorName ? `Médecin: ${userSettings.doctorName}` : ''}

${userSettings.medicalConditions && userSettings.medicalConditions.length > 0 ? 
  `Conditions médicales: ${userSettings.medicalConditions.join(', ')}` : ''}
${userSettings.medications && userSettings.medications.length > 0 ? 
  `Médicaments: ${userSettings.medications.join(', ')}` : ''}

Plage cible: ${userSettings.targetMin}-${userSettings.targetMax} ${unit}
`;

    const content = `
RAPPORT DE SUIVI GLYCÉMIQUE - GlycoFlex
Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}

═══════════════════════════════════════════════════════════════

${profileInfo}

═══════════════════════════════════════════════════════════════

RÉSUMÉ STATISTIQUE

Période d'analyse: ${measurements.length > 0 ? 
  `Du ${new Date(measurements[measurements.length - 1].timestamp).toLocaleDateString('fr-FR')} au ${new Date(measurements[0].timestamp).toLocaleDateString('fr-FR')}` : 
  'Aucune donnée'
}

Nombre total de mesures: ${stats.count}
Glycémie moyenne: ${stats.average.toFixed(1)} ${unit}
Glycémie minimale: ${stats.min} ${unit}
Glycémie maximale: ${stats.max} ${unit}
Temps dans la plage cible: ${stats.timeInRange ? stats.timeInRange.toFixed(1) : 0}%

RÉPARTITION PAR NIVEAU:
• Hypoglycémie (< ${userSettings.targetMin} ${unit}): ${statusCounts.low} mesures (${((statusCounts.low / stats.count) * 100).toFixed(1)}%)
• Normal (${userSettings.targetMin}-${userSettings.targetMax} ${unit}): ${statusCounts.normal} mesures (${((statusCounts.normal / stats.count) * 100).toFixed(1)}%)
• Hyperglycémie (> ${userSettings.targetMax} ${unit}): ${statusCounts.high} mesures (${((statusCounts.high / stats.count) * 100).toFixed(1)}%)

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
    
    return `  ${time} | ${m.value} ${unit} ${statusText} | ${m.type}${notes}`;
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

  const generateHTML = () => {
    const textContent = generatePDFContent();
    // Convertir le texte brut en HTML en préservant la mise en forme
    const htmlContent = textContent
      .replace(/\n/g, '<br/>')
      .replace(/ /g, '&nbsp;')
      .replace(/═+/g, '<hr style="border-top: 2px dashed #667EEA; margin: 20px 0;" />');
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rapport GlycoFlex</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .logo {
          width: 80px;
          height: 80px;
          margin-right: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #667EEA;
        }
        .section {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 8px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #667EEA;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        .footer {
          margin-top: 40px;
          font-size: 12px;
          text-align: center;
          color: #888;
        }
        .disclaimer {
          font-style: italic;
          color: #FF6B35;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUri ? `<img src="${logoUri}" class="logo" alt="GlycoFlex Logo"/>` : ''}
        <div class="title">GlycoFlex - Rapport de Suivi Glycémique</div>
      </div>
      
      <div class="content">
        ${htmlContent}
      </div>
      
      <div class="footer">
        <p class="disclaimer">⚠️ Ce rapport est à des fins informatives uniquement. Consultez votre médecin pour l'interprétation médicale.</p>
        <p>GlycoFlex - Application de Suivi Glycémique | ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
    `;
  };

  const handleExport = async () => {
    if (measurements.length === 0) {
      toast.show('Aucune donnée', 'Aucune mesure à exporter');
      return;
    }

    setIsGenerating(true);
    
    try {
      if (Platform.OS === 'web') {
        // Pour le web, générer un PDF ou un fichier texte téléchargeable
        const htmlContent = generateHTML();
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport-glycemie-${userSettings.name ? userSettings.name.toLowerCase().replace(/\s+/g, '-') : 'patient'}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.show('Succès', 'Rapport exporté avec succès');
      } else {
        // Pour mobile, utiliser expo-print pour générer un PDF
        const html = generateHTML();
        const { uri } = await Print.printToFileAsync({ html });
        
        if (Platform.OS === 'ios') {
          await Sharing.shareAsync(uri);
        } else {
          const baseDirectory = FileSystem.Paths?.document?.uri
            ?? FileSystem.Paths?.cache?.uri
            ?? (FileSystem as any).documentDirectory
            ?? (FileSystem as any).cacheDirectory
            ?? '';
          const pdfName = `glycoflex-report-${new Date().toISOString().split('T')[0]}.pdf`;
          const destinationUri = `${baseDirectory}${pdfName}`;
          
          await FileSystem.moveAsync({
            from: uri,
            to: destinationUri
          });
          
          await Sharing.shareAsync(destinationUri);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.show('Erreur', "Impossible d'exporter le rapport");
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