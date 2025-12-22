import browser from "webextension-polyfill";
import { type Folder, type FolderDetails, anoriSchema } from "./anori-schema";
import { type HlcTimestamp, createHlc, generateNodeId } from "./hlc";
import { HLC_STATE_KEY, SCHEMA_VERSION_KEY } from "./keys";
import { getStoredSchemaVersion, runMigrations, setStoredSchemaVersion } from "./migrations";
import { setGlobalStorage } from "./react";
import { type Storage, createStorage } from "./storage";
import type { StorageRecord } from "./types";

const LEGACY_STORAGE_VERSION_KEY = "storageVersion";

type LegacyFolderDetails = { widgets: unknown[] };

type LegacyStorageContent = {
  folders?: Folder[];
  storageVersion?: number;
  newTabTitle?: string;
};

/**
 * Checks if the storage contains legacy data that needs to be migrated.
 * Legacy storage is identified by having `storageVersion` key but no `__schema_version`.
 */
async function isLegacyStorage(): Promise<boolean> {
  const data = await browser.storage.local.get([SCHEMA_VERSION_KEY, LEGACY_STORAGE_VERSION_KEY]);
  const newSchemaVersion = data[SCHEMA_VERSION_KEY];
  const legacyVersion = data[LEGACY_STORAGE_VERSION_KEY];

  return newSchemaVersion === undefined && legacyVersion !== undefined;
}

/**
 * Wraps a value in a StorageRecord with an HLC timestamp.
 */
function wrapValue<T>(value: T, hlc: HlcTimestamp, brand?: string): StorageRecord<T> {
  return {
    hlc,
    value,
    deleted: false,
    brand,
  };
}

/**
 * Migrates legacy storage format to the new schema format.
 * This handles the transition from the old `storageVersion` system to the new `__schema_version` system.
 */
async function migrateFromLegacy(): Promise<void> {
  const allData = (await browser.storage.local.get(null)) as LegacyStorageContent;

  const hlc = createHlc(generateNodeId());
  const newData: Record<string, unknown> = {};

  // Migrate folders cell
  const folders = allData.folders ?? [];
  newData.folders = wrapValue(folders, hlc.tick());

  // Migrate newTabTitle cell
  const newTabTitle = allData.newTabTitle ?? "Anori";
  newData.newTabTitle = wrapValue(newTabTitle, hlc.tick());

  // Migrate folder details collection (Folder.{id} keys)
  const folderIds = new Set<string>();

  // Include "home" folder which always exists
  folderIds.add("home");

  // Add all custom folder IDs
  for (const folder of folders) {
    folderIds.add(folder.id);
  }

  // Find all Folder.* keys in storage (legacy format)
  for (const key of Object.keys(allData)) {
    if (key.startsWith("Folder.")) {
      const id = key.substring("Folder.".length);
      folderIds.add(id);
    }
  }

  // Migrate each folder's details (from Folder.{id} to Folder:{id})
  for (const folderId of folderIds) {
    const legacyKey = `Folder.${folderId}`;
    const newKey = `Folder:${folderId}`;
    const legacyDetails = (allData as Record<string, unknown>)[legacyKey] as LegacyFolderDetails | undefined;

    const details: FolderDetails = {
      widgets: Array.isArray(legacyDetails?.widgets) ? (legacyDetails.widgets as FolderDetails["widgets"]) : [],
    };

    newData[newKey] = wrapValue(details, hlc.tick(), "FolderDetails");
  }

  // Store HLC state
  newData[HLC_STATE_KEY] = hlc.getState();

  // Set the new schema version
  newData[SCHEMA_VERSION_KEY] = anoriSchema.currentVersion;

  await browser.storage.local.set(newData);

  console.log(
    `[Storage] Migrated from legacy storage (v${allData.storageVersion ?? 0}) to schema v${anoriSchema.currentVersion}`,
  );
}

export type AnoriStorage = Storage<typeof anoriSchema>;

export type StorageInitResult = {
  success: boolean;
  wasLegacyMigration: boolean;
  fromVersion: number;
  toVersion: number;
  storage?: AnoriStorage;
  error?: Error;
};

/**
 * Creates and initializes the storage instance after migrations.
 */
async function createAndInitializeStorage(): Promise<AnoriStorage> {
  const storage = createStorage({ schema: anoriSchema });
  await storage.initialize();
  setGlobalStorage(storage);
  return storage;
}

/**
 * Initializes the storage system, handling both legacy migrations and schema migrations.
 *
 * Call this function during extension startup before using the storage API.
 *
 * Migration flow:
 * 1. If `__schema_version` is not set but `storageVersion` exists → legacy migration
 * 2. If `__schema_version` is not set and no `storageVersion` → fresh install
 * 3. If `__schema_version` is set but less than current → run schema migrations
 * 4. Create and initialize the storage instance
 *
 * @returns The initialized storage instance on success
 */
export async function initializeAnoriStorage(): Promise<StorageInitResult> {
  try {
    const isLegacy = await isLegacyStorage();

    if (isLegacy) {
      await migrateFromLegacy();
      const storage = await createAndInitializeStorage();

      return {
        success: true,
        wasLegacyMigration: true,
        fromVersion: 0,
        toVersion: anoriSchema.currentVersion,
        storage,
      };
    }

    const currentVersion = await getStoredSchemaVersion();

    if (currentVersion === 0) {
      // Fresh install - just set the version
      await setStoredSchemaVersion(anoriSchema.currentVersion);
      const storage = await createAndInitializeStorage();

      return {
        success: true,
        wasLegacyMigration: false,
        fromVersion: 0,
        toVersion: anoriSchema.currentVersion,
        storage,
      };
    }

    // Run schema migrations if needed
    const result = await runMigrations(anoriSchema);

    if (!result.success) {
      return {
        success: false,
        wasLegacyMigration: false,
        fromVersion: result.fromVersion,
        toVersion: result.toVersion,
        error: result.error,
      };
    }

    const storage = await createAndInitializeStorage();

    return {
      success: true,
      wasLegacyMigration: false,
      fromVersion: result.fromVersion,
      toVersion: result.toVersion,
      storage,
    };
  } catch (error) {
    return {
      success: false,
      wasLegacyMigration: false,
      fromVersion: 0,
      toVersion: 0,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
