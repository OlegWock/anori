import { type ApiClientWithReconnect, createApiClient, isAppErrorOfType } from "@anori-app/api-client";
import { CommitLogPrunedError } from "@anori-app/api-types";
import { type AnoriStorage, anoriSchema, anoriVersionedSchema } from "@anori/utils/storage";
import type { HlcTimestamp } from "@anori/utils/storage-lib/hlc";
import type { OutboxChangeCallback } from "@anori/utils/storage-lib/storage";
import type { FileMetaValue, StorageRecord } from "@anori/utils/storage-lib/types";
import { getApiClient } from "./api-client";
import { clearSession, isSessionError } from "./auth";
import { API_BASE_URL } from "./consts";
import { getCloudAccount } from "./storage";

type RemoteCell = {
  key: string;
  value?: unknown;
  deleted: boolean;
  schemaVersion: number;
  hlc: { pt: number; lc: number; node: string };
  brand?: string;
  fileDownloadUrl: string | null;
};

type KvMutation = {
  key: string;
  value: unknown;
  deleted: boolean;
  schemaVersion: number;
  hlc: { pt: number; lc: number; node: string };
  brand?: string;
};

/**
 * Manages synchronization between local storage and the cloud backend.
 *
 * Responsibilities:
 * - Push outbox changes to backend (real-time and batch)
 * - Pull changes from backend (delta and full sync)
 * - Handle WebSocket subscription for real-time updates
 * - Initial push/pull operations for profile setup
 */
const OUTBOX_FLUSH_DEBOUNCE_MS = 500;

export class SyncManager {
  private storage: AnoriStorage;
  private outboxUnsubscribe: (() => void) | null = null;
  private subscriptionClient: ApiClientWithReconnect | null = null;
  private remoteSubscription: { unsubscribe: () => void } | null = null;
  private flushOutboxTimeout: ReturnType<typeof setTimeout> | null = null;
  private isFlushingOutbox = false;

  constructor(storage: AnoriStorage) {
    this.storage = storage;
  }

  /**
   * Starts automatic synchronization:
   * - Subscribes to outbox changes and pushes them to backend
   * - Subscribes to WebSocket for real-time updates from backend
   */
  start(): void {
    this.setupOutboxSync();
    this.setupRemoteSubscription();
  }

  /**
   * Stops all synchronization and cleans up resources.
   */
  stop(): void {
    if (this.outboxUnsubscribe) {
      this.outboxUnsubscribe();
      this.outboxUnsubscribe = null;
    }

    if (this.flushOutboxTimeout) {
      clearTimeout(this.flushOutboxTimeout);
      this.flushOutboxTimeout = null;
    }

    if (this.remoteSubscription) {
      this.remoteSubscription.unsubscribe();
      this.remoteSubscription = null;
    }
  }

  /**
   * Performs a sync cycle:
   * 1. Flushes all pending outbox items to backend
   * 2. Pulls remote changes (delta if possible, full sync as fallback)
   */
  async performSync(): Promise<void> {
    const syncSettings = this.storage.get(anoriSchema.cloudSyncSettings);
    if (!syncSettings) {
      return;
    }

    const { profileId, latestSeq } = syncSettings;
    const client = getApiClient();

    await this.flushOutbox(profileId);

    try {
      const deltaData = await client.sync.deltaSync.query({
        profileId,
        sinceSeq: latestSeq,
      });

      await this.applyRemoteCells(deltaData.cells);

      await this.storage.set(anoriSchema.cloudSyncSettings, {
        profileId,
        latestSeq: deltaData.latestSeq,
      });
    } catch (error) {
      if (isAppErrorOfType(error, CommitLogPrunedError)) {
        console.log("Delta sync failed due to pruned history, falling back to full sync");

        const fullData = await client.sync.fullSync.query({ profileId });
        await this.applyRemoteCells(fullData.cells);

        await this.storage.set(anoriSchema.cloudSyncSettings, {
          profileId,
          latestSeq: fullData.latestSeq,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Connects to a profile, either pulling from existing or pushing to new.
   * @param profileId - The profile to connect to
   * @param mode - 'pull' to overwrite local with remote, 'push' to overwrite remote with local
   */
  async connect(profileId: string, mode: "pull" | "push"): Promise<void> {
    if (mode === "pull") {
      await this.pullFromProfile(profileId);
    } else {
      await this.pushToProfile(profileId);
    }
    this.storage.sync.enableOutbox();
  }

  private async pullFromProfile(profileId: string): Promise<void> {
    // TODO: this code leaves dangling records because we never clean already existing cells that aren't present on remote
    const client = getApiClient();
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;

    const remoteData = await client.sync.fullSync.query({ profileId });

    const changes: Array<{
      key: string;
      record: StorageRecord<unknown>;
      schemaVersion: number;
    }> = [];
    const fileDownloads: Array<{
      key: string;
      fileDownloadUrl: string;
    }> = [];

    for (const cell of remoteData.cells) {
      if (cell.schemaVersion !== currentSchemaVersion) {
        continue;
      }

      changes.push({
        key: cell.key,
        record: {
          hlc: cell.hlc,
          value: cell.deleted ? null : cell.value,
          deleted: cell.deleted,
          brand: cell.brand,
        },
        schemaVersion: cell.schemaVersion,
      });

      if (cell.fileDownloadUrl !== null && !cell.deleted) {
        fileDownloads.push({
          key: cell.key,
          fileDownloadUrl: cell.fileDownloadUrl,
        });
      }
    }

    const fileBlobs = new Map<string, Blob>();
    await Promise.all(
      fileDownloads.map(async ({ key, fileDownloadUrl }) => {
        try {
          const response = await fetch(fileDownloadUrl);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const blob = await response.blob();
          fileBlobs.set(key, blob);
        } catch (error) {
          console.error(`Failed to download file ${key}:`, error);
        }
      }),
    );

    await this.storage.sync.applyRemoteChangesIgnoringHlc(changes, fileBlobs);
    await this.storage.sync.clearOutbox();

    await this.storage.set(anoriSchema.cloudSyncSettings, {
      profileId,
      latestSeq: remoteData.latestSeq,
    });

    this.setupRemoteSubscription();
  }

  private async pushToProfile(profileId: string): Promise<void> {
    const client = getApiClient();
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;

    const { kv, files } = this.storage.sync.exportForFullSync();

    const syncedEntries: Array<{ key: string; hlc: HlcTimestamp }> = [];

    const kvMutations: KvMutation[] = Object.entries(kv).map(([key, record]) => ({
      key,
      value: record.deleted ? null : record.value,
      deleted: record.deleted ?? false,
      schemaVersion: currentSchemaVersion,
      hlc: record.hlc,
      brand: record.brand,
    }));

    const fileEntries: Array<{ key: string; record: StorageRecord<unknown>; blob: Blob }> = [];
    for (const [key, { record, path }] of Object.entries(files)) {
      if (record.deleted) {
        kvMutations.push({
          key,
          value: null,
          deleted: true,
          schemaVersion: currentSchemaVersion,
          hlc: record.hlc,
          brand: record.brand,
        });
        continue;
      }

      const blob = await this.storage.files.getBlob(path);
      if (!blob) {
        continue;
      }

      fileEntries.push({ key, record, blob });
    }

    if (kvMutations.length > 0) {
      await client.sync.writeKv.mutate({
        profileId,
        mutations: kvMutations,
      });
      syncedEntries.push(...kvMutations.map((m) => ({ key: m.key, hlc: m.hlc })));
    }

    if (fileEntries.length > 0) {
      const fileMutations = fileEntries.map(({ key, record, blob }) => ({
        key,
        value: record.value,
        deleted: false,
        schemaVersion: currentSchemaVersion,
        hlc: record.hlc,
        brand: record.brand,
        fileSize: blob.size,
      }));

      const uploadResponse = await client.sync.requestFileUpload.mutate({
        profileId,
        files: fileMutations,
      });

      await Promise.all(
        uploadResponse.uploads.map(async ({ key, uploadUrl, uploadId }) => {
          const fileEntry = fileEntries.find((e) => e.key === key);
          if (!fileEntry) {
            return;
          }

          try {
            const response = await fetch(uploadUrl, {
              method: "PUT",
              body: fileEntry.blob,
              headers: {
                "Content-Type": fileEntry.blob.type || "application/octet-stream",
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to upload file: ${response.statusText}`);
            }

            await client.sync.confirmFileUpload.mutate({
              profileId,
              uploadId,
              key,
            });
            syncedEntries.push({ key, hlc: fileEntry.record.hlc });
          } catch (error) {
            console.error(`Failed to upload file ${key}:`, error);
          }
        }),
      );
    }

    if (syncedEntries.length > 0) {
      await this.storage.sync.removeFromOutbox(syncedEntries);
    }

    await this.storage.set(anoriSchema.cloudSyncSettings, {
      profileId,
      latestSeq: 0,
    });

    this.setupRemoteSubscription();
  }

  /**
   * Disconnects from the current profile and clears sync settings.
   */
  async disconnect(): Promise<void> {
    this.storage.sync.disableOutbox();
    this.stop();
    await this.storage.set(anoriSchema.cloudSyncSettings, null);
  }

  /**
   * Restarts the remote subscription. Call this after sync settings change.
   */
  restartRemoteSubscription(): void {
    this.setupRemoteSubscription();
  }

  private setupOutboxSync(): void {
    if (this.outboxUnsubscribe) {
      this.outboxUnsubscribe();
    }

    const handleChange: OutboxChangeCallback = () => {
      if (this.flushOutboxTimeout) {
        clearTimeout(this.flushOutboxTimeout);
      }

      this.flushOutboxTimeout = setTimeout(() => {
        this.flushOutboxTimeout = null;
        this.debouncedFlushOutbox();
      }, OUTBOX_FLUSH_DEBOUNCE_MS);
    };

    this.outboxUnsubscribe = this.storage.sync.subscribeToOutbox(handleChange);
  }

  private async debouncedFlushOutbox(): Promise<void> {
    if (this.isFlushingOutbox) {
      return;
    }

    const syncSettings = this.storage.get(anoriSchema.cloudSyncSettings);
    if (!syncSettings) {
      return;
    }

    this.isFlushingOutbox = true;
    try {
      await this.flushOutbox(syncSettings.profileId);
    } catch (error) {
      console.error("Failed to auto-sync outbox:", error);
    } finally {
      this.isFlushingOutbox = false;
    }
  }

  private setupRemoteSubscription(): void {
    if (this.remoteSubscription) {
      this.remoteSubscription.unsubscribe();
    }

    const syncSettings = this.storage.get(anoriSchema.cloudSyncSettings);
    if (!syncSettings) {
      return;
    }

    const profileId = syncSettings.profileId;
    const client = this.getSubscriptionClient();

    this.remoteSubscription = client.client.sync.onProfileUpdates.subscribe(
      { profileId },
      {
        onData: async (event) => {
          if (event.type === "cellUpdated") {
            await this.applyRemoteCells([event.cell]);
          } else if (event.type === "profileDeleted") {
            await this.disconnect();
          }
        },
        onError: (error) => {
          console.error("Remote sync subscription error:", error);
        },
      },
    );
  }

  private getSubscriptionClient(): ApiClientWithReconnect {
    if (!this.subscriptionClient) {
      this.subscriptionClient = createApiClient({
        url: API_BASE_URL,
        token: () => getCloudAccount()?.sessionToken,
        onOpen: () => {
          console.log("Remote sync WebSocket connected");
        },
        onClose: (cause) => {
          console.log("Remote sync WebSocket disconnected", cause);
        },
        retryDelayMs: 5000,
      });
    }
    return this.subscriptionClient;
  }

  private async flushOutbox(profileId: string): Promise<void> {
    const client = getApiClient();
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;
    const outbox = this.storage.sync.exportOutbox();

    const syncedEntries: Array<{ key: string; hlc: HlcTimestamp }> = [];

    for (const entry of outbox) {
      try {
        if (entry.type === "file") {
          if (entry.record.deleted) {
            const kvMutation: KvMutation = {
              key: entry.key,
              value: null,
              deleted: true,
              schemaVersion: currentSchemaVersion,
              hlc: entry.record.hlc,
              brand: entry.record.brand,
            };
            await client.sync.writeKv.mutate({
              profileId,
              mutations: [kvMutation],
            });
            syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
            continue;
          }

          const fileMeta = entry.record.value as FileMetaValue<unknown> | null;
          if (!fileMeta || !fileMeta.path) {
            syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
            continue;
          }

          const blob = await this.storage.files.getBlob(fileMeta.path);
          if (!blob) {
            syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
            continue;
          }

          const fileMutation = {
            key: entry.key,
            value: fileMeta,
            deleted: false,
            schemaVersion: currentSchemaVersion,
            hlc: entry.record.hlc,
            brand: entry.record.brand,
            fileSize: blob.size,
          };

          const uploadResponse = await client.sync.requestFileUpload.mutate({
            profileId,
            files: [fileMutation],
          });

          if (uploadResponse.uploads.length === 0) {
            continue;
          }

          const { uploadUrl, uploadId } = uploadResponse.uploads[0];

          const response = await fetch(uploadUrl, {
            method: "PUT",
            body: blob,
            headers: {
              "Content-Type": blob.type || "application/octet-stream",
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
          }

          await client.sync.confirmFileUpload.mutate({
            profileId,
            uploadId,
            key: entry.key,
          });
          syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
        } else {
          const kvMutation: KvMutation = {
            key: entry.key,
            value: entry.record.deleted ? null : entry.record.value,
            deleted: entry.record.deleted ?? false,
            schemaVersion: currentSchemaVersion,
            hlc: entry.record.hlc,
            brand: entry.record.brand,
          };

          await client.sync.writeKv.mutate({
            profileId,
            mutations: [kvMutation],
          });
          syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
        }
      } catch (error) {
        console.error(`Failed to sync outbox item ${entry.key}:`, error);
      }
    }

    if (syncedEntries.length > 0) {
      await this.storage.sync.removeFromOutbox(syncedEntries);
    }
  }

  private async applyRemoteCells(cells: RemoteCell[]): Promise<void> {
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;

    const changes: Array<{
      key: string;
      record: StorageRecord<unknown>;
      schemaVersion: number;
    }> = [];
    const fileDownloads: Array<{
      key: string;
      fileDownloadUrl: string;
    }> = [];

    for (const cell of cells) {
      if (cell.schemaVersion !== currentSchemaVersion) {
        continue;
      }

      changes.push({
        key: cell.key,
        record: {
          hlc: cell.hlc,
          value: cell.deleted ? null : cell.value,
          deleted: cell.deleted,
          brand: cell.brand,
        },
        schemaVersion: cell.schemaVersion,
      });

      if (cell.fileDownloadUrl !== null && !cell.deleted) {
        fileDownloads.push({
          key: cell.key,
          fileDownloadUrl: cell.fileDownloadUrl,
        });
      }
    }

    const fileBlobs = new Map<string, Blob>();
    await Promise.all(
      fileDownloads.map(async ({ key, fileDownloadUrl }) => {
        try {
          const response = await fetch(fileDownloadUrl);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const blob = await response.blob();
          fileBlobs.set(key, blob);
        } catch (error) {
          console.error(`Failed to download file ${key}:`, error);
        }
      }),
    );

    await this.storage.sync.mergeRemoteChanges(changes, fileBlobs);
  }
}

const syncManagers = new Map<AnoriStorage, SyncManager>();

/**
 * Gets or creates a SyncManager instance for the given storage.
 */
export function getSyncManager(storage: AnoriStorage): SyncManager {
  let manager = syncManagers.get(storage);
  if (!manager) {
    manager = new SyncManager(storage);
    syncManagers.set(storage, manager);
  }
  return manager;
}

/**
 * Starts sync for the given storage. Idempotent - safe to call multiple times.
 * Also enables outbox if storage is linked to a profile.
 */
export function startSync(storage: AnoriStorage): void {
  const syncSettings = storage.get(anoriSchema.cloudSyncSettings);
  if (syncSettings) {
    storage.sync.enableOutbox();
  }

  const manager = getSyncManager(storage);
  manager.start();
}

/**
 * Stops sync for the given storage.
 */
export function stopSync(storage: AnoriStorage): void {
  const manager = getSyncManager(storage);
  manager.stop();
}

/**
 * Performs sync cycle: flushes outbox then pulls remote changes.
 */
export async function performSync(storage: AnoriStorage): Promise<void> {
  const manager = getSyncManager(storage);
  try {
    await manager.performSync();
  } catch (error) {
    if (isSessionError(error)) {
      console.warn("Sync failed due to invalid session, clearing session");
      await clearSession();
      return;
    }
    console.error("Sync failed:", error);
  }
}

/**
 * Connects to a profile.
 * @param mode - 'pull' to overwrite local with remote (connecting to existing), 'push' to overwrite remote with local (creating new)
 */
export async function connectToProfile(storage: AnoriStorage, profileId: string, mode: "pull" | "push"): Promise<void> {
  const manager = getSyncManager(storage);
  await manager.connect(profileId, mode);
}

/**
 * Disconnects from the current profile.
 */
export async function disconnectFromProfile(storage: AnoriStorage): Promise<void> {
  const manager = getSyncManager(storage);
  await manager.disconnect();
}
