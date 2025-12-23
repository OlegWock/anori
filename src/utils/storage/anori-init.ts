import { anoriSchema } from "@anori/utils/storage/anori-schema";
import { isLegacyStorage, migrateFromLegacy } from "@anori/utils/storage/migrations/legacy-migration";
import { getStoredSchemaVersion, runMigrations, setStoredSchemaVersion } from "@anori/utils/storage/migrations/runner";
import { type Storage, createStorage } from "@anori/utils/storage/storage";

export type AnoriStorage = Storage<typeof anoriSchema>;

let globalStorage: Promise<AnoriStorage> | AnoriStorage | null = null;

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
export async function getAnoriStorage(): Promise<AnoriStorage> {
  if (globalStorage) {
    return globalStorage;
  }

  const promise = initAnoriStorage();
  promise.then((storage) => {
    globalStorage = storage;
  });
  globalStorage = promise;
  return promise;
}

export function getAnoriStorageNoWait(): AnoriStorage {
  if (globalStorage && !(globalStorage instanceof Promise)) {
    return globalStorage;
  }
  throw new Error("Storage is not ready yet");
}

async function initAnoriStorage(): Promise<AnoriStorage> {
  const isLegacy = await isLegacyStorage();

  if (isLegacy) {
    await migrateFromLegacy();
    const storage = createStorage({ schema: anoriSchema });
    await storage.initialize();

    return storage;
  }

  const currentVersion = await getStoredSchemaVersion();

  if (currentVersion === 0) {
    // Fresh install - just set the version
    await setStoredSchemaVersion(anoriSchema.currentVersion);
    const storage = createStorage({ schema: anoriSchema });
    await storage.initialize();

    return storage;
  }

  // Run schema migrations if needed
  const result = await runMigrations(anoriSchema);

  if (!result.success) {
    console.error("Storage migration failed", result.error);
    throw result.error;
  }

  const storage = createStorage({ schema: anoriSchema });
  await storage.initialize();
  return storage;
}
