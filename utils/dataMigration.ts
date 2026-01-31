/**
 * Gestionnaire de migrations sans dépendance Firebase.
 * Les migrations sont désormais locales et optionnelles.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLogger } from './logger';

const logger = new AppLogger('DataMigration');

interface MigrationState {
  lastCompletedVersion: string;
  migrations: Record<string, { completed: boolean; completedAt: number | null; error: string | null }>;
}

type MigrationFunction = () => Promise<void>;

interface MigrationDefinition {
  version: string;
  description: string;
  migrateUp: MigrationFunction;
  isRequired: boolean;
}

interface MigrationResult {
  success: boolean;
  version: string;
  error?: string;
  duration: number;
}

export class DataMigration {
  private migrations: MigrationDefinition[] = [];
  private userId: string | null = null;
  private stateKey = 'glycoflex_migration_state_local';

  initialize(userId: string | null) {
    this.userId = userId;
    this.stateKey = `glycoflex_migration_state_${userId || 'anonymous'}`;
    logger.info('Gestionnaire de migrations local initialisé', { userId });
  }

  registerMigration(migration: MigrationDefinition): void {
    const existingIndex = this.migrations.findIndex((m) => m.version === migration.version);
    if (existingIndex >= 0) {
      this.migrations[existingIndex] = migration;
    } else {
      this.migrations.push(migration);
    }
    this.migrations.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  async checkMigrations(targetVersion: string): Promise<{ required: boolean; migrations: string[] }> {
    if (!this.userId) {
      return { required: false, migrations: [] };
    }

    const state = await this.getMigrationState();
    const required: string[] = [];

    for (const migration of this.migrations) {
      if (this.compareVersions(migration.version, targetVersion) > 0) {
        continue;
      }
      const isCompleted = this.compareVersions(migration.version, state.lastCompletedVersion) <= 0;
      if (!isCompleted && (migration.isRequired || required.length > 0)) {
        required.push(migration.version);
      }
    }

    return { required: required.length > 0, migrations: required };
  }

  async runMigrations(targetVersion: string): Promise<MigrationResult[]> {
    if (!this.userId) {
      return [];
    }

    const state = await this.getMigrationState();
    const results: MigrationResult[] = [];

    for (const migration of this.migrations) {
      if (this.compareVersions(migration.version, targetVersion) > 0) {
        continue;
      }
      if (this.compareVersions(migration.version, state.lastCompletedVersion) <= 0) {
        continue;
      }

      const startedAt = Date.now();
      try {
        await migration.migrateUp();
        state.lastCompletedVersion = migration.version;
        state.migrations[migration.version] = { completed: true, completedAt: Date.now(), error: null };
        results.push({ success: true, version: migration.version, duration: Date.now() - startedAt });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        state.migrations[migration.version] = { completed: false, completedAt: null, error: message };
        results.push({ success: false, version: migration.version, duration: Date.now() - startedAt, error: message });
        logger.error(`Migration échouée: ${migration.version}`, { error: message });
      }

      await this.saveMigrationState(state);
    }

    return results;
  }

  private compareVersions(v1: string, v2: string): number {
    const parse = (version: string) => version.split('.').map((part) => parseInt(part, 10) || 0);
    const parts1 = parse(v1);
    const parts2 = parse(v2);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a !== b) {
        return a - b;
      }
    }
    return 0;
  }

  private async getMigrationState(): Promise<MigrationState> {
    try {
      const stored = await AsyncStorage.getItem(this.stateKey);
      if (stored) {
        return JSON.parse(stored) as MigrationState;
      }
    } catch (error) {
      logger.warn('Impossible de lire l\'état des migrations locales', { error });
    }

    return {
      lastCompletedVersion: '0.0.0',
      migrations: {}
    };
  }

  private async saveMigrationState(state: MigrationState): Promise<void> {
    try {
      await AsyncStorage.setItem(this.stateKey, JSON.stringify(state));
    } catch (error) {
      logger.warn('Impossible de sauvegarder l\'état des migrations locales', { error });
    }
  }
}

export const dataMigration = new DataMigration();
export default dataMigration;
