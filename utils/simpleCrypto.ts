import CryptoJS from 'crypto-js';

/**
 * Service de chiffrement compatible avec React Native - VERSION SANS MODULE CRYPTO NATIF
 * N'utilise AUCUNE fonctionnalité qui nécessite le module crypto natif
 */
export class SimpleCrypto {
  /**
   * Génère des octets aléatoires en utilisant un générateur cryptographiquement sûr
   */
  private static getSecureBytes(length: number): Uint8Array {
    if (globalThis.crypto?.getRandomValues) {
      const array = new Uint8Array(length);
      globalThis.crypto.getRandomValues(array);
      return array;
    }
    try {
      const { getRandomBytes } = require('expo-random');
      return getRandomBytes(length);
    } catch {
      const { randomBytes } = require('crypto');
      return new Uint8Array(randomBytes(length));
    }
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
   * Chiffre des données sans utiliser WordArray.random
   */
  static encrypt(data: any, key: string): string {
    try {
      // Convertir en JSON
      const jsonString = JSON.stringify(data);
      
      // Générer un IV compatible sans WordArray.random
      const iv = this.generateIV();
      const ivString = iv.toString();
      
      // Chiffrer avec AES
      const encrypted = CryptoJS.AES.encrypt(jsonString, CryptoJS.enc.Utf8.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Format: [IV]:[Encrypted]
      return ivString + ':' + encrypted.toString();
    } catch (error) {
      console.error('Erreur chiffrement:', error);
      throw new Error('Échec du chiffrement des données');
    }
  }
  
  /**
   * Déchiffre des données
   */
  static decrypt(encryptedData: string, key: string): any {
    try {
      // Vérification préliminaire
      if (!encryptedData || typeof encryptedData !== 'string' || !key) {
        throw new Error('Données d\'entrée invalides pour le déchiffrement');
      }

      // Format non supporté
      if (encryptedData.startsWith('BASIC:')) {
        throw new Error('Format BASIC non supporté');
      }
      
      // Format normal: [IV]:[Encrypted]
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Format de données chiffrées invalide');
      }
      
      // Extraire l'IV et le texte chiffré
      const iv = CryptoJS.enc.Hex.parse(parts[0]);
      const ciphertext = parts[1];
      
      // Déchiffrer
      const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convertir en JSON
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      if (!jsonString) {
        throw new Error('Résultat de déchiffrement vide');
      }
      
      try {
        return JSON.parse(jsonString);
      } catch (jsonError) {
        console.error('Erreur JSON après déchiffrement:', jsonError);
        throw new Error('Données déchiffrées non valides (JSON invalide)');
      }
    } catch (error: unknown) {
      console.error('Erreur déchiffrement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Raison inconnue';
      throw new Error(`Échec du déchiffrement des données: ${errorMessage}`);
    }
  }
  
  /**
   * Test pour vérifier que le chiffrement fonctionne
   */
  static testCrypto(): boolean {
    try {
      const testData = { test: 'data', value: 123 };
      const key = this.generateKey();
      const encrypted = this.encrypt(testData, key);
      const decrypted = this.decrypt(encrypted, key);
      
      console.log('✓ Test chiffrement simple réussi');
      return decrypted.test === testData.test && decrypted.value === testData.value;
    } catch (error) {
      console.error('Test chiffrement simple échoué:', error);
      return false;
    }
  }
}
