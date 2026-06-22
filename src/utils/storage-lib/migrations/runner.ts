import browser from "webextension-polyfill";
import { createHlc, generateNodeId, type HlcState, type HlcTimestamp } from "../hlc";
import { HLC_STATE_KEY, SCHEMA_VERSION_KEY } from "../keys";
import type { SchemaDefinition } from "../schema/version";
import { getMigrationPath, type Migration, type VersionedSchema } from "../schema/versioned";
import type { StorageRecord } from "../types";
import { createFromAccessor, createToAccessor } from "./context";

/** Records the migration explicitly wrote or tombstoned (the change to apply on top of a head). */
export type MigrationDiff = Record<string, StorageRecord<unknown>>;

function isKeyTrackedInSchema(key: string, schema: SchemaDefinition): boolean {
  for (const descriptor of Object.values(schema)) {
    if ("key" in descriptor && descriptor.key === key) {
      return "tracked" in descriptor && descriptor.tracked === true;
    }
    if ("keyPrefix" in descriptor && key.startsWith(`${descriptor.keyPrefix}:`)) {
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

function findSchemas(schema: VersionedSchema, migration: Migration) {
  const fromSchema = schema.versions.find((v) => v.version === migration.fromVersion);
  const toSchema = schema.versions.find((v) => v.version === migration.toVersion);
  if (!fromSchema || !toSchema) {
    throw new Error(`Schema version not found: from=${migration.fromVersion}, to=${migration.toVersion}`);
  }
  return { fromSchema, toSchema };
}

/** Extracts the records relevant to `fromDef` (tracked or not) from a flat key→record map. */
function buildSnapshot(fromDef: SchemaDefinition, allData: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const descriptor of Object.values(fromDef)) {
    if ("key" in descriptor) {
      if (descriptor.key in allData) {
        snapshot[descriptor.key] = allData[descriptor.key];
      }
    } else if ("keyPrefix" in descriptor) {
      const prefixWithColon = `${descriptor.keyPrefix}:`;
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(prefixWithColon)) {
          snapshot[key] = value;
        }
      }
    }
  }
  return snapshot;
}

/** Runs one migration's `migrate()` against an in-memory snapshot, returning the records it wrote. */
async function runMigrationStep(
  fromDef: SchemaDefinition,
  toDef: SchemaDefinition,
  migration: Migration,
  snapshot: Record<string, unknown>,
  hlcTick: () => HlcTimestamp,
): Promise<MigrationDiff> {
  const target: MigrationDiff = {};
  const fromAccessor = createFromAccessor(fromDef, snapshot);
  const toAccessor = createToAccessor(toDef, target, snapshot, hlcTick);

  await migration.migrate({
    from: {
      schema: fromDef,
      get: fromAccessor.get.bind(fromAccessor) as typeof fromAccessor.get,
      getRecord: fromAccessor.getRecord.bind(fromAccessor) as typeof fromAccessor.getRecord,
    },
    to: {
      schema: toDef,
      set: toAccessor.set.bind(toAccessor) as typeof toAccessor.set,
      delete: toAccessor.delete.bind(toAccessor) as typeof toAccessor.delete,
    },
  });

  return target;
}

/**
 * Migrates an in-memory snapshot through the migration path, without touching
 * `browser.storage.local`. Returns the net diff (records the migrations wrote/tombstoned) and
 * the resulting full snapshot. Used by the first-upgrader to migrate the cloud head it fetched.
 */
export async function migrateSnapshot(
  schema: VersionedSchema,
  fromVersion: number,
  toVersion: number,
  snapshot: Record<string, StorageRecord<unknown>>,
  hlcTick: () => HlcTimestamp,
): Promise<{ diff: MigrationDiff; snapshot: Record<string, StorageRecord<unknown>> }> {
  const working: Record<string, unknown> = { ...snapshot };
  const diff: MigrationDiff = {};

  for (const migration of getMigrationPath(schema, fromVersion, toVersion)) {
    const { fromSchema, toSchema } = findSchemas(schema, migration);
    const target = await runMigrationStep(fromSchema.definition, toSchema.definition, migration, working, hlcTick);
    for (const [key, record] of Object.entries(target)) {
      working[key] = record;
      diff[key] = record;
    }
  }

  return { diff, snapshot: working as Record<string, StorageRecord<unknown>> };
}

async function runSingleMigration(schema: VersionedSchema, migration: Migration): Promise<void> {
  const { fromSchema, toSchema } = findSchemas(schema, migration);

  const allData = await browser.storage.local.get(null);
  const snapshot = buildSnapshot(fromSchema.definition, allData);

  const hlcState = allData[HLC_STATE_KEY] as HlcState | undefined;
  const hlc = hlcState ? createHlc(hlcState.nodeId, hlcState.last) : createHlc(generateNodeId());

  const target = await runMigrationStep(fromSchema.definition, toSchema.definition, migration, snapshot, () =>
    hlc.tick(),
  );

  const toWrite: Record<string, StorageRecord<unknown>> = {};
  const toRemove: string[] = [];
  for (const [key, record] of Object.entries(target)) {
    const isTracked =
      isKeyTrackedInSchema(key, fromSchema.definition) || isKeyTrackedInSchema(key, toSchema.definition);
    if (record.deleted && !isTracked) {
      toRemove.push(key);
    } else {
      toWrite[key] = record;
    }
  }

  if (Object.keys(toWrite).length > 0) {
    await browser.storage.local.set(toWrite);
  }
  if (toRemove.length > 0) {
    await browser.storage.local.remove(toRemove);
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
