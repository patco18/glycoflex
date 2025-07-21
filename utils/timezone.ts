import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'react-native-localize';

const TIMEZONE_STORAGE_KEY = 'user_timezone';

// Obtenir le fuseau horaire du système
export const getSystemTimezone = (): string => {
  return Localization.getTimeZone();
};

// Sauvegarder le fuseau horaire utilisateur
export const saveUserTimezone = async (timezone: string) => {
  try {
    await AsyncStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du fuseau horaire:', error);
  }
};

// Charger le fuseau horaire utilisateur
export const loadUserTimezone = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(TIMEZONE_STORAGE_KEY);
    return saved || getSystemTimezone();
  } catch (error) {
    console.error('Erreur lors du chargement du fuseau horaire:', error);
    return getSystemTimezone();
  }
};

// Convertir un timestamp vers un fuseau horaire spécifique
export const convertToTimezone = (timestamp: number, timezone: string): Date => {
  const date = new Date(timestamp);
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
};

// Formater une date selon le fuseau horaire et la locale
export const formatDateInTimezone = (
  timestamp: number, 
  timezone: string, 
  locale: string = 'fr-FR',
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    ...options,
  };
  
  return new Date(timestamp).toLocaleString(locale, defaultOptions);
};

// Obtenir l'offset du fuseau horaire en heures
export const getTimezoneOffset = (timezone: string): number => {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
  return (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
};

// Liste des fuseaux horaires populaires
export const getPopularTimezones = () => [
  { label: 'UTC', value: 'UTC' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'Los Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
];

// Détecter un changement de fuseau horaire
export const detectTimezoneChange = async (): Promise<boolean> => {
  const currentSystemTimezone = getSystemTimezone();
  const savedTimezone = await loadUserTimezone();
  return currentSystemTimezone !== savedTimezone;
};

// Ajuster les timestamps lors d'un voyage
export const adjustMeasurementsForTravel = (
  measurements: any[], 
  oldTimezone: string, 
  newTimezone: string
) => {
  const oldOffset = getTimezoneOffset(oldTimezone);
  const newOffset = getTimezoneOffset(newTimezone);
  const offsetDiff = (newOffset - oldOffset) * 60 * 60 * 1000; // en millisecondes
  
  return measurements.map(measurement => ({
    ...measurement,
    timestamp: measurement.timestamp + offsetDiff,
    originalTimezone: oldTimezone,
    adjustedForTimezone: newTimezone,
  }));
};