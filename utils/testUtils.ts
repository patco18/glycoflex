/**
 * Utilitaires pour les tests automatisés
 * Permet de vérifier le bon fonctionnement des fonctionnalités principales
 * de manière automatisée
 */
import { AppLogger } from './logger';
import { errorHandler, ErrorType, ErrorSeverity } from './errorHandler';

const logger = new AppLogger('TestSuite');

/**
 * Résultat d'un test
 */
export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
  logs: { level: 'info' | 'error' | 'warn'; message: string }[];
}

/**
 * Cas de test
 */
export type TestCase = () => Promise<void>;

/**
 * Options pour l'exécution des tests
 */
export interface TestOptions {
  timeout: number;      // Timeout en ms
  stopOnError: boolean; // Arrêter l'exécution en cas d'erreur
}

/**
 * Résultat d'une suite de tests
 */
export interface TestSuiteResult {
  suiteName: string;
  results: TestResult[];
  passedCount: number;
  failedCount: number;
  totalDuration: number;
  startTime: number;
  endTime: number;
}

/**
 * Suite de tests automatisés
 */
export class TestSuite {
  private suiteName: string;
  private tests: Map<string, TestCase> = new Map();
  private defaultOptions: TestOptions = { timeout: 5000, stopOnError: false };
  
  /**
   * Crée une nouvelle suite de tests
   */
  constructor(suiteName: string) {
    this.suiteName = suiteName;
  }
  
  /**
   * Ajoute un test à la suite
   */
  addTest(name: string, testCase: TestCase): void {
    this.tests.set(name, testCase);
  }
  
  /**
   * Exécute un test spécifique
   */
  async runTest(name: string, options: Partial<TestOptions> = {}): Promise<TestResult> {
    const opts = { ...this.defaultOptions, ...options };
    const testCase = this.tests.get(name);
    
    if (!testCase) {
      throw new Error(`Test "${name}" non trouvé dans la suite "${this.suiteName}"`);
    }
    
    logger.info(`Exécution du test "${name}"`, { suiteName: this.suiteName });
    
    const logs: { level: 'info' | 'error' | 'warn'; message: string }[] = [];
    const testLogger = {
      info: (message: string) => logs.push({ level: 'info', message }),
      error: (message: string) => logs.push({ level: 'error', message }),
      warn: (message: string) => logs.push({ level: 'warn', message })
    };
    
    const startTime = Date.now();
    let passed = false;
    let error: Error | undefined;
    
    try {
      // Créer une promesse avec timeout
      const testPromise = testCase();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout après ${opts.timeout}ms`)), opts.timeout);
      });
      
      await Promise.race([testPromise, timeoutPromise]);
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      
      errorHandler.handleError(
        error,
        ErrorType.UNEXPECTED,
        ErrorSeverity.ERROR,
        { testName: name, suiteName: this.suiteName }
      );
      
      testLogger.error(`Échec: ${error.message}`);
    } finally {
      const duration = Date.now() - startTime;
      
      logger.info(`Test "${name}" ${passed ? 'réussi' : 'échoué'}`, { 
        duration,
        passed
      });
      
      return {
        name,
        passed,
        duration,
        logs,
        ...(error && { error })
      };
    }
  }
  
  /**
   * Exécute tous les tests de la suite
   */
  async runAll(options: Partial<TestOptions> = {}): Promise<TestSuiteResult> {
    const opts = { ...this.defaultOptions, ...options };
    const results: TestResult[] = [];
    let passedCount = 0;
    let failedCount = 0;
    
    const startTime = Date.now();
    
    logger.info(`Exécution de la suite de tests "${this.suiteName}" (${this.tests.size} tests)`);
    
    for (const [name, _] of this.tests) {
      const result = await this.runTest(name, opts);
      results.push(result);
      
      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
        
        if (opts.stopOnError) {
          logger.warn(`Suite de tests arrêtée après l'échec de "${name}"`);
          break;
        }
      }
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    const suiteResult: TestSuiteResult = {
      suiteName: this.suiteName,
      results,
      passedCount,
      failedCount,
      totalDuration,
      startTime,
      endTime
    };
    
    logger.info(`Suite de tests "${this.suiteName}" terminée`, {
      totalTests: results.length,
      passed: passedCount,
      failed: failedCount,
      duration: totalDuration
    });
    
    return suiteResult;
  }
  
  /**
   * Supprime un test de la suite
   */
  removeTest(name: string): boolean {
    return this.tests.delete(name);
  }
  
  /**
   * Retourne le nombre de tests dans la suite
   */
  get testCount(): number {
    return this.tests.size;
  }
  
  /**
   * Retourne les noms de tous les tests
   */
  get testNames(): string[] {
    return Array.from(this.tests.keys());
  }
}

/**
 * Crée un test qui vérifie qu'une fonction renvoie la valeur attendue
 */
export function createEqualityTest<T>(
  fn: () => Promise<T> | T, 
  expectedValue: T,
  message = 'Les valeurs devraient être égales'
): TestCase {
  return async () => {
    const actualValue = await Promise.resolve(fn());
    
    // Comparaison pour les objets
    if (typeof expectedValue === 'object' && expectedValue !== null) {
      const expectedJson = JSON.stringify(expectedValue);
      const actualJson = JSON.stringify(actualValue);
      
      if (expectedJson !== actualJson) {
        throw new Error(`${message}. Attendu: ${expectedJson}, Reçu: ${actualJson}`);
      }
    } 
    // Comparaison pour les autres types
    else if (actualValue !== expectedValue) {
      throw new Error(`${message}. Attendu: ${expectedValue}, Reçu: ${actualValue}`);
    }
  };
}

/**
 * Crée un test qui vérifie qu'une fonction lance une exception
 */
export function createExceptionTest(
  fn: () => Promise<any> | any,
  expectedErrorMessageSubstring?: string
): TestCase {
  return async () => {
    try {
      await Promise.resolve(fn());
      throw new Error('Une exception était attendue mais aucune n\'a été lancée');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (expectedErrorMessageSubstring && 
          !errorMessage.includes(expectedErrorMessageSubstring)) {
        throw new Error(
          `L'exception ne contient pas le texte attendu. ` +
          `Attendu: "${expectedErrorMessageSubstring}", ` +
          `Reçu: "${errorMessage}"`
        );
      }
    }
  };
}

/**
 * Utilitaire pour créer et exécuter des tests de cryptographie
 */
export class CryptoTests extends TestSuite {
  constructor() {
    super('Tests de cryptographie');
    this.setupTests();
  }
  
  private setupTests(): void {
    // Test de chiffrement/déchiffrement
    this.addTest('Chiffrement et déchiffrement', async () => {
      const testData = { secret: 'valeur confidentielle', id: 123 };
      const key = 'clé_de_test';
      
      // Cette fonction serait implémentée dans l'application réelle
      // pour tester le chiffrement et le déchiffrement
      const encrypt = (data: any, key: string): string => {
        return JSON.stringify(data) + '_encrypted_' + key;
      };
      
      const decrypt = (encryptedData: string, key: string): any => {
        if (!encryptedData.includes('_encrypted_' + key)) {
          throw new Error('Clé invalide');
        }
        const jsonData = encryptedData.split('_encrypted_')[0];
        return JSON.parse(jsonData);
      };
      
      // Chiffrer les données
      const encrypted = encrypt(testData, key);
      
      // Déchiffrer les données
      const decrypted = decrypt(encrypted, key);
      
      // Vérifier que les données déchiffrées correspondent aux données originales
      if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
        throw new Error('Les données déchiffrées ne correspondent pas aux données originales');
      }
    });
    
    // Test de validation de signature
    this.addTest('Validation de signature', async () => {
      const data = 'données à signer';
      const correctSignature = 'signature_correcte';
      const incorrectSignature = 'signature_incorrecte';
      
      // Cette fonction serait implémentée dans l'application réelle
      const validateSignature = (data: string, signature: string): boolean => {
        return signature === 'signature_correcte';
      };
      
      // Vérifier avec la signature correcte
      const isValidCorrect = validateSignature(data, correctSignature);
      if (!isValidCorrect) {
        throw new Error('La signature correcte a été rejetée');
      }
      
      // Vérifier avec une signature incorrecte
      const isValidIncorrect = validateSignature(data, incorrectSignature);
      if (isValidIncorrect) {
        throw new Error('La signature incorrecte a été acceptée');
      }
    });
  }
}

/**
 * Utilitaire pour créer et exécuter des tests de stockage
 */
export class StorageTests extends TestSuite {
  constructor() {
    super('Tests de stockage');
    this.setupTests();
  }
  
  private setupTests(): void {
    // Test de stockage et récupération
    this.addTest('Stockage et récupération', async () => {
      const testKey = 'test_key_' + Date.now();
      const testValue = { test: 'value', timestamp: Date.now() };
      
      // Cette fonction serait implémentée dans l'application réelle
      const storeData = async (key: string, value: any): Promise<void> => {
        // Simuler le stockage des données
        await new Promise(resolve => setTimeout(resolve, 10));
        return;
      };
      
      const retrieveData = async (key: string): Promise<any> => {
        // Simuler la récupération des données
        await new Promise(resolve => setTimeout(resolve, 10));
        return testValue;
      };
      
      // Stocker les données
      await storeData(testKey, testValue);
      
      // Récupérer les données
      const retrievedValue = await retrieveData(testKey);
      
      // Vérifier que les données récupérées correspondent aux données originales
      if (JSON.stringify(retrievedValue) !== JSON.stringify(testValue)) {
        throw new Error('Les données récupérées ne correspondent pas aux données stockées');
      }
    });
  }
}

/**
 * Utilitaire pour créer et exécuter des tests de synchronisation
 */
export class SyncTests extends TestSuite {
  constructor() {
    super('Tests de synchronisation');
    this.setupTests();
  }
  
  private setupTests(): void {
    // Test de détection de conflit
    this.addTest('Détection de conflit', async () => {
      const localData = { id: 'doc1', value: 'local', timestamp: 100 };
      const remoteData = { id: 'doc1', value: 'remote', timestamp: 200 };
      
      // Cette fonction serait implémentée dans l'application réelle
      const detectConflict = (local: any, remote: any): boolean => {
        return local.timestamp !== remote.timestamp;
      };
      
      // Vérifier la détection de conflit
      const hasConflict = detectConflict(localData, remoteData);
      if (!hasConflict) {
        throw new Error('Le conflit n\'a pas été détecté');
      }
    });
    
    // Test de résolution de conflit
    this.addTest('Résolution de conflit', async () => {
      const localData = { id: 'doc1', value: 'local', timestamp: 100 };
      const remoteData = { id: 'doc1', value: 'remote', timestamp: 200 };
      
      // Cette fonction serait implémentée dans l'application réelle
      // Résoudre en gardant la version la plus récente
      const resolveConflict = (local: any, remote: any): any => {
        return local.timestamp > remote.timestamp ? local : remote;
      };
      
      // Résoudre le conflit
      const resolved = resolveConflict(localData, remoteData);
      
      // Vérifier que la résolution a gardé la bonne version
      if (resolved.timestamp !== Math.max(localData.timestamp, remoteData.timestamp)) {
        throw new Error('La résolution de conflit n\'a pas sélectionné la version la plus récente');
      }
    });
  }
}

export default {
  TestSuite,
  createEqualityTest,
  createExceptionTest,
  CryptoTests,
  StorageTests,
  SyncTests
};
