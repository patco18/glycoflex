import CryptoJS from 'crypto-js';
import { getRandomBytes } from 'expo-random';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { logError } from './logService';

// Constantes pour le stockage des clés
const ENCRYPTION_KEY_STORAGE = 'GLYCOFLEX_ENCRYPTION_KEY_V2';
const LEGACY_KEYS_STORAGE = 'GLYCOFLEX_LEGACY_KEYS';
const KEY_VERSION_STORAGE = 'GLYCOFLEX_KEY_VERSION';

/**
 * Service de chiffrement amélioré avec versionning des clés et meilleure robustesse
 */
export class EnhancedEncryptionService {
  // État du service
  private static encryptionKey: string | null = null;
  private static keyVersion: number = 1;
  private static legacyKeys: string[] = [];
  private static keyHashCache: string = '';
  private static initialized: boolean = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Génère des octets aléatoires en utilisant un générateur cryptographiquement sûr
   */
  private static getSecureBytes(length: number): Uint8Array {
    if (globalThis.crypto?.getRandomValues) {
      const array = new Uint8Array(length);
      globalThis.crypto.getRandomValues(array);
      return array;
    }

    return getRandomBytes(length);
  }

  /**
   * Génère une chaîne hexadécimale aléatoire sécurisée
   */
  static generateRandomBytes(length: number): string {
    const bytes = this.getSecureBytes(length);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += bytes[i].toString(16).padStart(2, '0');
    }
    return result;
  }

  /**
   * Génère un IV compatible pour AES
   */
  static generateIV(): any {
    // Générer 16 octets (128 bits) pour IV AES
    const ivHex = this.generateRandomBytes(16);
    return CryptoJS.enc.Hex.parse(ivHex);
  }

  /**
   * Génère une clé de chiffrement compatible
   */
  static generateKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = this.getSecureBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(bytes[i] % chars.length);
    }
    return result;
  }

  /**
   * Initialise la clé d'encryption
   */
  static async initializeEncryptionKey(forceNew: boolean = false): Promise<void> {
    // Utiliser une promesse partagée pour éviter plusieurs initialisations simultanées
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeKey(forceNew);
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Implémentation interne de l'initialisation de la clé
   */
  private static async _initializeKey(forceNew: boolean): Promise<void> {
    try {
      if (this.initialized && this.encryptionKey && !forceNew) {
        return;
      }

      // Charger la version actuelle de la clé
      const versionStr = await AsyncStorage.getItem(KEY_VERSION_STORAGE);
      this.keyVersion = versionStr ? parseInt(versionStr, 10) : 1;

      // Essayer de récupérer la clé depuis le stockage sécurisé
      let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);

      if (!key) {
        // Migration éventuelle depuis AsyncStorage
        key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
        if (key) {
          await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
          await AsyncStorage.removeItem(ENCRYPTION_KEY_STORAGE);
        }
      }

      // Si forceNew est activé ou si aucune clé n'existe, générer une nouvelle clé
      if (forceNew || !key) {
        // Sauvegarder l'ancienne clé comme legacy si elle existe
        if (key) {
          const legacyJson = await AsyncStorage.getItem(LEGACY_KEYS_STORAGE);
          let legacyKeys = legacyJson ? JSON.parse(legacyJson) : [];
          legacyKeys.unshift(key); // Ajouter la clé actuelle comme première clé legacy
          legacyKeys = legacyKeys.slice(0, 5); // Garder maximum 5 clés legacy
          await AsyncStorage.setItem(LEGACY_KEYS_STORAGE, JSON.stringify(legacyKeys));
        }

        // Générer une nouvelle clé et incrémenter la version
        key = this.generateKey(32);
        await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
        this.keyVersion++;
        await AsyncStorage.setItem(KEY_VERSION_STORAGE, this.keyVersion.toString());
      }

      this.encryptionKey = key;
      
      // Pré-calculer un hash court pour instrumentation
      try {
        this.keyHashCache = CryptoJS.SHA256(key).toString().substring(0, 12);
      } catch (e) {
        console.error('Erreur lors du calcul du hash de clé:', e);
      }

      // Charger les clés legacy
      try {
        const legacyJson = await AsyncStorage.getItem(LEGACY_KEYS_STORAGE);
        this.legacyKeys = legacyJson ? JSON.parse(legacyJson) : [];
      } catch (e) {
        console.error('Erreur lors du chargement des clés legacy:', e);
        this.legacyKeys = [];
      }

      this.initialized = true;
      console.log(`🔐 Clé d'encryption initialisée (v${this.keyVersion}, hash: ${this.keyHashCache})`);

      // Tester le chiffrement pour vérifier qu'il fonctionne
      await this.testCrypto();
    } catch (error) {
      logError(error);
      console.error("❌ Échec de l'initialisation de la clé d'encryption:", error);
      throw new Error("Échec de l'initialisation du chiffrement");
    }
  }

  /**
   * Teste que le chiffrement fonctionne correctement
   */
  static async testCrypto(): Promise<boolean> {
    try {
      const testData = { test: 'Ceci est un test', timestamp: Date.now() };
      const testString = JSON.stringify(testData);
      
      // Chiffrer les données de test
      const encrypted = await this.encrypt(testString);
      
      // Déchiffrer les données de test
      const decrypted = await this.decrypt(encrypted);
      
      // Vérifier que le résultat est identique
      const result = decrypted === testString;
      
      if (result) {
        console.log('✓ Test chiffrement réussi');
      } else {
        console.error('❌ Test chiffrement échoué: les données ne correspondent pas');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Test chiffrement échoué avec erreur:', error);
      return false;
    }
  }

  /**
   * Chiffre des données
   * @param data Données à chiffrer (chaîne de caractères)
   * @returns Données chiffrées (format: iv:encrypted)
   */
  static async encrypt(data: string): Promise<string> {
    if (!this.initialized || !this.encryptionKey) {
      await this.initializeEncryptionKey();
    }

    if (!this.encryptionKey) {
      throw new Error('Clé de chiffrement non initialisée');
    }

    try {
      // Générer un IV unique pour chaque opération de chiffrement
      const iv = this.generateIV();
      
      // Chiffrer les données
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Concaténer l'IV et les données chiffrées pour pouvoir déchiffrer plus tard
      const ivHex = CryptoJS.enc.Hex.stringify(iv);
      const result = `${ivHex}:${encrypted.toString()}`;
      
      // Ajouter la version de la clé
      return `v${this.keyVersion}:${result}`;
    } catch (error) {
      logError({ message: "Erreur de chiffrement", details: error });
      throw new Error('Échec du chiffrement des données');
    }
  }

  /**
   * Déchiffre des données
   * @param encryptedData Données chiffrées (format: [v1:]iv:encrypted)
   * @returns Données déchiffrées
   */
  static async decrypt(encryptedData: string): Promise<string> {
    if (!this.initialized || !this.encryptionKey) {
      await this.initializeEncryptionKey();
    }

    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Données chiffrées invalides');
    }

    try {
      // Extraire la version de la clé et les données chiffrées
      let version = 1;
      let dataWithIV = encryptedData;
      
      // Détecter si le format inclut la version
      if (encryptedData.startsWith('v') && encryptedData.includes(':', 1)) {
        const firstColon = encryptedData.indexOf(':');
        const versionStr = encryptedData.substring(1, firstColon);
        version = parseInt(versionStr, 10);
        dataWithIV = encryptedData.substring(firstColon + 1);
      }
      
      // Extraire l'IV et les données chiffrées
      const separatorIndex = dataWithIV.indexOf(':');
      if (separatorIndex === -1) {
        throw new Error('Format de données chiffrées invalide');
      }
      
      const ivHex = dataWithIV.substring(0, separatorIndex);
      const encrypted = dataWithIV.substring(separatorIndex + 1);
      
      // Convertir l'IV en format utilisable
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      
      // Déterminer la clé à utiliser selon la version
      let keyToUse = this.encryptionKey;
      
      // Si la version ne correspond pas à la version actuelle, utiliser une clé legacy
      if (version !== this.keyVersion) {
        const legacyKeyIndex = this.keyVersion - version - 1;
        if (legacyKeyIndex >= 0 && legacyKeyIndex < this.legacyKeys.length) {
          keyToUse = this.legacyKeys[legacyKeyIndex];
          console.log(`♻️ Déchiffrement avec clé legacy v${version}`);
        }
      }
      
      if (!keyToUse) {
        throw new Error('Aucune clé valide pour cette version');
      }
      
      // Déchiffrer les données
      const decrypted = CryptoJS.AES.decrypt(encrypted, keyToUse, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convertir en chaîne de caractères
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!result) {
        throw new Error('Résultat de déchiffrement vide');
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors du déchiffrement:', error);
      throw error; // Propager l'erreur pour une meilleure gestion en amont
    }
  }

  /**
   * Réinitialise la clé d'encryption et force la création d'une nouvelle clé
   * Utile pour résoudre les problèmes de déchiffrement
   */
  static async resetEncryptionKey(): Promise<void> {
    try {
      // Sauvegarder l'ancienne clé si elle existe
      if (this.encryptionKey) {
        const legacyJson = await AsyncStorage.getItem(LEGACY_KEYS_STORAGE);
        let legacyKeys = legacyJson ? JSON.parse(legacyJson) : [];
        legacyKeys.unshift(this.encryptionKey);
        legacyKeys = legacyKeys.slice(0, 5); // Garder maximum 5 clés
        await AsyncStorage.setItem(LEGACY_KEYS_STORAGE, JSON.stringify(legacyKeys));
      }

      // Générer une nouvelle clé
      this.encryptionKey = this.generateKey(32);
      this.keyVersion++;
      
      // Sauvegarder la nouvelle clé et sa version
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, this.encryptionKey);
      await AsyncStorage.setItem(KEY_VERSION_STORAGE, this.keyVersion.toString());
      
      // Mettre à jour le hash
      this.keyHashCache = CryptoJS.SHA256(this.encryptionKey).toString().substring(0, 12);
      
      console.log(`🔑 Clé d'encryption réinitialisée (nouvelle version: ${this.keyVersion})`);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation de la clé:', error);
      throw new Error('Échec de la réinitialisation de la clé');
    }
  }
}
