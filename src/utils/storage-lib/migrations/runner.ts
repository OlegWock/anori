import browser from "webextension-polyfill";
import { type HlcState, createHlc, generateNodeId } from "../hlc";
import { HLC_STATE_KEY, SCHEMA_VERSION_KEY } from "../keys";
import type { SchemaDefinition } from "../schema/version";
import { type Migration, type VersionedSchema, getMigrationPath } from "../schema/versioned";
import type { StorageRecord } from "../types";
import { createFromAccessor, createToAccessor } from "./context";

function isKeyTrackedInSchema(key: string, schema: SchemaDefinition): boolean {
  for (const descriptor of Object.values(schema)) {
    if ("key" in descriptor && descriptor.key === key) {
      return "tracked" in descriptor && descriptor.tracked === true;
    }
    if ("keyPrefix" in descriptor && key.startsWith(descriptor.keyPrefix)) {
      return "tracked" in descriptor && descriptor.tracked === true;
    }
  }
  return false;
}

export type MigrationResult = {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  migrationsRun: number;
  error?: Error;
};

/**
 * Reads the current schema version stored in browser.storage.local.
 * Returns 0 if no version is stored (fresh install).
 */
export async function getStoredSchemaVersion(): Promise<number> {
  const data = await browser.storage.local.get(SCHEMA_VERSION_KEY);
  const version = data[SCHEMA_VERSION_KEY];
  if (typeof version === "number") {
    return version;
  }
  return 0;
}

/**
 * Stores the schema version in browser.storage.local.
 */
export async function setStoredSchemaVersion(version: number): Promise<void> {
  await browser.storage.local.set({ [SCHEMA_VERSION_KEY]: version });
}

/**
 * Runs all necessary migrations to bring storage from its current version
 * to the latest schema version.
 *
 * Migrations are executed sequentially in order. Each migration:
 * 1. Loads the entire storage into memory
 * 2. Creates from/to accessors for the migration function
 * 3. Executes the migration function
 * 4. On success: persists all changes and updates schema version
 * 5. On failure: discards changes, returns error (no partial writes)
 */
export async function runMigrations(schema: VersionedSchema): Promise<MigrationResult> {
  const storedVersion = await getStoredSchemaVersion();
  const targetVersion = schema.currentVersion;

  if (storedVersion === 0) {
    await setStoredSchemaVersion(targetVersion);
    return {
      success: true,
      fromVersion: 0,
      toVersion: targetVersion,
      migrationsRun: 0,
    };
  }

  if (storedVersion >= targetVersion) {
    return {
      success: true,
      fromVersion: storedVersion,
      toVersion: targetVersion,
      migrationsRun: 0,
    };
  }

  const migrations = getMigrationPath(schema, storedVersion, targetVersion);

  if (migrations.length === 0) {
    await setStoredSchemaVersion(targetVersion);
    return {
      success: true,
      fromVersion: storedVersion,
      toVersion: targetVersion,
      migrationsRun: 0,
    };
  }

  let currentVersion = storedVersion;
  let migrationsRun = 0;

  for (const migration of migrations) {
    try {
      await runSingleMigration(schema, migration);
      currentVersion = migration.toVersion;
      migrationsRun++;
      await setStoredSchemaVersion(currentVersion);
    } catch (error) {
      return {
        success: false,
        fromVersion: storedVersion,
        toVersion: currentVersion,
        migrationsRun,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  return {
    success: true,
    fromVersion: storedVersion,
    toVersion: targetVersion,
    migrationsRun,
  };
}

async function runSingleMigration(schema: VersionedSchema, migration: Migration): Promise<void> {
  const fromSchema = schema.versions.find((v) => v.version === migration.fromVersion);
  const toSchema = schema.versions.find((v) => v.version === migration.toVersion);

  if (!fromSchema || !toSchema) {
    throw new Error(`Schema version not found: from=${migration.fromVersion}, to=${migration.toVersion}`);
  }

  const allData = await browser.storage.local.get(null);

  const snapshot: Record<string, unknown> = {};
  for (const descriptor of Object.values(fromSchema.definition)) {
    if ("key" in descriptor) {
      const key = descriptor.key;
      if (key in allData) {
        snapshot[key] = allData[key];
      }
    } else if ("keyPrefix" in descriptor) {
      const prefix = descriptor.keyPrefix;
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(prefix)) {
          snapshot[key] = value;
        }
      }
    }
  }

  const target: Record<string, StorageRecord<unknown>> = {};

  const hlcState = allData[HLC_STATE_KEY] as HlcState | undefined;
  const hlc = hlcState ? createHlc(hlcState.nodeId, hlcState.last) : createHlc(generateNodeId());

  const fromAccessor = createFromAccessor(fromSchema.definition, snapshot);
  const toAccessor = createToAccessor(toSchema.definition, target, () => hlc.tick());

  await migration.migrate({
    from: {
      schema: fromSchema.definition,
      get: fromAccessor.get.bind(fromAccessor) as typeof fromAccessor.get,
    },
    to: {
      schema: toSchema.definition,
      set: toAccessor.set.bind(toAccessor) as typeof toAccessor.set,
      delete: toAccessor.delete.bind(toAccessor) as typeof toAccessor.delete,
    },
  });

  const keysToRemove: string[] = [];
  const tombstones: Record<string, StorageRecord<null>> = {};

  for (const key of Object.keys(snapshot)) {
    if (!(key in target)) {
      const wasTracked = isKeyTrackedInSchema(key, fromSchema.definition);
      const existingRecord = snapshot[key] as StorageRecord<unknown> | undefined;

      if (wasTracked && existingRecord && !existingRecord.deleted) {
        tombstones[key] = {
          hlc: hlc.tick(),
          value: null,
          deleted: true,
          brand: existingRecord.brand,
        };
      } else {
        keysToRemove.push(key);
      }
    }
  }

  if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
  }

  if (Object.keys(target).length > 0 || Object.keys(tombstones).length > 0) {
    await browser.storage.local.set({ ...target, ...tombstones });
  }

  await browser.storage.local.set({
    [HLC_STATE_KEY]: hlc.getState(),
  });
}

/**
 * Checks if migrations are needed without running them.
 */
export async function needsMigration(schema: VersionedSchema): Promise<boolean> {
  const storedVersion = await getStoredSchemaVersion();
  return storedVersion !== 0 && storedVersion < schema.currentVersion;
}
