import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

/**
 * Service de chiffrement compatible avec React Native
 * Utilise uniquement des méthodes de crypto-js compatibles avec React Native
 * sans dépendance au module natif crypto
 */
export class CryptoService {
  /**
   * Chiffrer des données avec AES
   * @param data Données à chiffrer
   * @param key Clé de chiffrement
   * @returns Données chiffrées
   */
  static encrypt(data: any, key: string): string {
    // Convertir en JSON
    const jsonString = JSON.stringify(data);
    
    // Utiliser WordArray.random de CryptoJS au lieu du module crypto natif
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Chiffrer avec un IV aléatoire pour plus de sécurité
    const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Concaténer IV et données chiffrées pour le stockage/transmission
    const result = iv.toString() + encrypted.toString();
    return result;
  }
  
  /**
   * Déchiffrer des données AES
   * @param encryptedData Données chiffrées
   * @param key Clé de chiffrement
   * @returns Données déchiffrées
   */
  static decrypt(encryptedData: string, key: string): any {
    try {
      // Extraire l'IV (les 32 premiers caractères sont l'IV en hex)
      const ivHex = encryptedData.substring(0, 32);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      
      // Le reste est le texte chiffré
      const ciphertext = encryptedData.substring(32);
      
      // Déchiffrer avec le même mode et padding
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convertir en chaîne puis parser en JSON
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Erreur lors du déchiffrement:', error);
      throw new Error('Échec du déchiffrement des données');
    }
  }
  
  /**
   * Génère une clé de chiffrement sécurisée sans dépendre du module crypto natif
   * @param length Longueur de la clé
   * @returns Clé de chiffrement
   */
  static generateKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    
    // Utiliser WordArray.random de CryptoJS comme source d'entropie
    const randomBytes = CryptoJS.lib.WordArray.random(length);
    const hexString = randomBytes.toString();
    
    // Convertir les bytes hexadécimaux en caractères de notre ensemble
    for (let i = 0; i < length; i++) {
      const randomIndex = parseInt(hexString.substr(i * 2, 2), 16) % chars.length;
      result += chars.charAt(randomIndex);
    }
    
    return result;
  }
  
  /**
   * Test de compatibilité pour vérifier que le chiffrement fonctionne
   * @returns True si tout fonctionne
   */
  static testCrypto(): boolean {
    try {
      const testData = { test: 'data', value: 123 };
      const key = this.generateKey();
      const encrypted = this.encrypt(testData, key);
      const decrypted = this.decrypt(encrypted, key);
      
      // Vérifier que le déchiffrement donne les mêmes données
      return decrypted.test === testData.test && decrypted.value === testData.value;
    } catch (error) {
      console.error('Test crypto échoué:', error);
      return false;
    }
  }
}
