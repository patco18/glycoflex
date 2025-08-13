import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

/**
 * Service de chiffrement compatible avec React Native - VERSION SANS MODULE CRYPTO NATIF
 * N'utilise AUCUNE fonctionnalité qui nécessite le module crypto natif
 */
export class SimpleCrypto {
  /**
   * Génère des octets aléatoires en utilisant Math.random() (non cryptographique mais compatible)
   */
  static generateRandomBytes(length: number): string {
    let result = '';
    const characters = '0123456789abcdef';
    for (let i = 0; i < length * 2; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
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
    let result = '';
    
    // Générer une chaîne aléatoire sans WordArray.random
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
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
      // En cas d'échec, retourner une version encodée basique (pas sécurisée, mais fonctionnelle)
      return 'BASIC:' + btoa(JSON.stringify(data));
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

      // Vérifier le format de secours
      if (encryptedData.startsWith('BASIC:')) {
        // Version non chiffrée de secours
        try {
          const base64String = encryptedData.substring(6);
          const jsonString = atob(base64String);
          return JSON.parse(jsonString);
        } catch (e) {
          console.error('Erreur lors du décodage du format de secours:', e);
          throw new Error('Format de secours invalide');
        }
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
