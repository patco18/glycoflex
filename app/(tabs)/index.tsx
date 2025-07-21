import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'expo-linear-gradient';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>{t('home.title', 'Glucose Monitor')}</Text>
        <Text style={styles.headerSubtitle}>{t('home.subtitle', 'Your health at a glance')}</Text>
      </LinearGradient>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('home.welcome', 'Welcome')}</Text>
          <Text style={styles.cardText}>
            {t('home.welcomeMessage', 'Track and monitor your glucose levels easily with our simple interface.')}
          </Text>
        </View>
        
        <View style={styles.navButtons}>
          <Link href="/(tabs)/add" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>{t('home.addMeasurement', 'Add Measurement')}</Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/(tabs)/history" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>{t('home.viewHistory', 'View History')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA"
  },
  headerGradient: {
    height: 180,
    padding: 20,
    justifyContent: 'flex-end',
    paddingBottom: 30
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8
  },
  content: {
    flex: 1,
    padding: 20,
    marginTop: -20,
    alignItems: "center"
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666'
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32
  },
  navButtons: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center'
  },
  button: {
    backgroundColor: '#4c669f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
