import { assertValue } from "@anori/utils/asserts";
import { type AnoriStorage, anoriSchema, anoriVersionedSchema } from "@anori/utils/storage";
import { capturePreUpdateBackup } from "@anori/utils/storage/pre-update-backup";
import { compareHlc, type HlcTimestamp } from "@anori/utils/storage-lib/hlc";
import { migrateSnapshot } from "@anori/utils/storage-lib/migrations/runner";
import { fileExists } from "@anori/utils/storage-lib/opfs";
import type { SyncScope } from "@anori/utils/storage-lib/schema";
import type { OutboxChangeCallback } from "@anori/utils/storage-lib/storage";
import { createSchemaHelpers } from "@anori/utils/storage-lib/storage-helpers";
import type { FileMetaValue, StorageRecord } from "@anori/utils/storage-lib/types";
import { type ApiClientWithReconnect, createApiClient, isAppErrorOfType } from "@anori-app/api-client";
import { CommitLogPrunedError, SchemaUpgradeConflictError, SchemaVersionMismatchError } from "@anori-app/api-types";
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
  hlc: { pt: number; lc: number; node: string };
  brand?: string;
};

type ScopeSyncData = {
  cells: RemoteCell[];
  latestSeq: number;
  schemaVersion: number;
  totalCount?: number;
};

const { getKeySyncMode } = createSchemaHelpers(anoriSchema);

/**
 * Downloads blobs for the given file cells, skipping any whose blob we already have locally
 * (a path uniquely identifies a blob, so an existing OPFS file at that path is the same blob).
 */
async function downloadFileBlobs(
  candidates: Array<{ key: string; fileDownloadUrl: string; path?: string }>,
): Promise<Map<string, Blob>> {
  const fileBlobs = new Map<string, Blob>();
  await Promise.all(
    candidates.map(async ({ key, fileDownloadUrl, path }) => {
      if (path && (await fileExists(path))) return;
      try {
        const response = await fetch(fileDownloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        fileBlobs.set(key, await response.blob());
      } catch (error) {
        console.error(`Failed to download file ${key}:`, error);
      }
    }),
  );
  return fileBlobs;
}

/** Per-key last-write-wins merge of two record maps; the higher HLC wins. */
function mergeByHlc(
  base: Record<string, StorageRecord<unknown>>,
  other: Record<string, StorageRecord<unknown>>,
): Record<string, StorageRecord<unknown>> {
  const merged: Record<string, StorageRecord<unknown>> = { ...base };
  for (const [key, record] of Object.entries(other)) {
    const existing = merged[key];
    if (!existing || compareHlc(record.hlc, existing.hlc) > 0) {
      merged[key] = record;
    }
  }
  return merged;
}

/**
 * Manages synchronization between local storage and the cloud backend.
 *
 * Data syncs at two scopes, routed independently:
 * - profile — bound to the connected cloud profile (cloudSyncSettings)
 * - user — account-global cells, synced whenever a cloud account is connected, even with no
 *   profile
 *
 * Responsibilities:
 * - Push outbox changes to backend (real-time and batch)
 * - Pull changes from backend (delta and full sync)
 * - Handle WebSocket subscriptions for real-time updates
 * - Initial push/pull operations for profile setup
 */
const OUTBOX_FLUSH_DEBOUNCE_MS = 500;

export class SyncManager {
  private storage: AnoriStorage;
  private outboxUnsubscribe: (() => void) | null = null;
  private subscriptionClient: ApiClientWithReconnect | null = null;
  private profileSubscription: { unsubscribe: () => void } | null = null;
  private userCellsSubscription: { unsubscribe: () => void } | null = null;
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
    this.refreshRemoteSubscriptions();
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

    this.teardownRemoteSubscriptions();
  }

  /**
   * Performs a sync cycle for every active scope:
   * 1. Pulls both scopes' heads in one round trip (delta if possible, full sync as fallback)
   * 2. Routes each scope independently through version gating, outbox flush, and apply
   */
  async performSync(): Promise<void> {
    const account = this.storage.get(anoriSchema.cloudAccount);
    if (!account) {
      return;
    }

    const syncSettings = this.storage.get(anoriSchema.cloudSyncSettings);
    const userState = this.storage.get(anoriSchema.cloudUserSyncState);
    const client = getApiClient();

    // Pull the heads first (without applying) to learn each scope's current schema version,
    // then route per scope. We must decide before flushing so we never push a newer-schema
    // write to an older-schema store.
    let profilePart: ScopeSyncData | undefined;
    let userPart: ScopeSyncData | undefined;
    try {
      const delta = await client.sync.deltaSync.query({
        ...(syncSettings ? { profileId: syncSettings.profileId, sinceSeq: syncSettings.latestSeq } : {}),
        sinceUserSeq: userState?.latestSeq ?? 0,
      });
      profilePart = delta.profile;
      userPart = delta.user;
    } catch (error) {
      if (!isAppErrorOfType(error, CommitLogPrunedError)) throw error;
      console.log("Delta sync failed due to pruned history, falling back to full sync");
      const full = await client.sync.fullSync.query({
        ...(syncSettings ? { profileId: syncSettings.profileId } : {}),
        includeUser: true,
      });
      profilePart = full.profile;
      userPart = full.user;
    }

    if (syncSettings && profilePart) {
      await this.syncProfileScope(syncSettings, profilePart);
    }
    if (userPart) {
      await this.syncUserScope(userPart);
    }
  }

  private async syncProfileScope(
    syncSettings: NonNullable<ReturnType<typeof this.getSyncSettings>>,
    part: ScopeSyncData,
  ): Promise<void> {
    const { profileId } = syncSettings;
    const profileSchemaVersion = part.schemaVersion;
    const localVersion = anoriVersionedSchema.currentVersion;
    const syncedVersion = syncSettings.syncedSchemaVersion ?? localVersion;

    if (profileSchemaVersion > localVersion) {
      // Behind: this extension is older than the profile. Pause (badge shown via the observed
      // version); don't apply, flush, or advance latestSeq.
      await this.storage.set(anoriSchema.cloudSyncSettings, { ...syncSettings, profileSchemaVersion });
      return;
    }

    if (profileSchemaVersion < localVersion) {
      // This extension's instance updated first and now needs to migrate the cloud profile.
      await this.storage.set(anoriSchema.cloudSyncSettings, { ...syncSettings, profileSchemaVersion });
      await this.upgradeProfileSchema(profileId);
      return;
    }

    if (syncedVersion < localVersion) {
      // Straggler: the cloud is already at our version but we migrated locally without
      // reconciling. Adopt the cloud (force-pull), discarding our edits into a backup first.
      await this.adoptAsStraggler(profileId);
      return;
    }

    // Normal sync path
    await this.flushOutbox("profile", profileId);
    await this.applyRemoteCells(part.cells);
    if (part.totalCount !== undefined) {
      await this.reconcileAfterFullSync(part.cells, part.totalCount, { protectOutbox: true, scope: "profile" });
    }
    await this.storage.set(anoriSchema.cloudSyncSettings, {
      ...syncSettings,
      latestSeq: part.latestSeq,
      profileSchemaVersion,
      syncedSchemaVersion: localVersion,
    });
  }

  private async syncUserScope(part: ScopeSyncData): Promise<void> {
    const localVersion = anoriVersionedSchema.currentVersion;
    const userState = this.storage.get(anoriSchema.cloudUserSyncState);

    if (part.schemaVersion > localVersion) {
      // Behind: pause the user scope only; profile sync keeps working independently.
      await this.storage.set(anoriSchema.cloudUserSyncState, {
        latestSeq: userState?.latestSeq ?? 0,
        syncedSchemaVersion: userState?.syncedSchemaVersion,
        userSchemaVersion: part.schemaVersion,
        ownerUserId: this.getAccountUserId(),
      });
      return;
    }

    if (part.schemaVersion < localVersion) {
      await this.upgradeUserSchema();
      return;
    }

    if (userState && (userState.syncedSchemaVersion ?? localVersion) < localVersion) {
      await this.pullUserScope();
      return;
    }

    await this.flushOutbox("user");
    await this.applyRemoteCells(part.cells);
    if (part.totalCount !== undefined) {
      await this.reconcileAfterFullSync(part.cells, part.totalCount, { protectOutbox: true, scope: "user" });
    }
    await this.storage.set(anoriSchema.cloudUserSyncState, {
      latestSeq: part.latestSeq,
      userSchemaVersion: part.schemaVersion,
      syncedSchemaVersion: localVersion,
      ownerUserId: this.getAccountUserId(),
    });
  }

  private getSyncSettings() {
    return this.storage.get(anoriSchema.cloudSyncSettings);
  }

  private getAccountUserId(): string | undefined {
    return this.storage.get(anoriSchema.cloudAccount)?.userId;
  }

  private async adoptAsStraggler(profileId: string): Promise<void> {
    await capturePreUpdateBackup(this.storage);
    await this.pullFromProfile(profileId);
  }

  /**
   * First-upgrader: the profile is still at an older schema than this client. Fetch the raw
   * old-schema head, migrate it, HLC-merge with local, and push the result via the seq-guarded
   * upgradeSchema. The merge is safe because an un-upgraded cloud has no newer-schema edits to
   * clobber; it preserves this device's own edits.
   */
  private async upgradeProfileSchema(profileId: string): Promise<void> {
    const client = getApiClient();
    const localVersion = anoriVersionedSchema.currentVersion;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { profile: head } = await client.sync.fullSync.query({ profileId });
      assertValue(head, "fullSync response is missing the requested profile scope");

      if (head.schemaVersion >= localVersion) {
        // Someone upgraded the profile before us; adopt their result as a straggler.
        await this.adoptAsStraggler(profileId);
        return;
      }
      const fromVersion = head.schemaVersion;

      const mutations = await this.buildUpgradeMutations(head.cells, fromVersion, "profile");

      try {
        await client.sync.upgradeSchema.mutate({
          profileId,
          fromVersion,
          toVersion: localVersion,
          expectedSeq: head.latestSeq,
          mutations,
        });
      } catch (error) {
        if (isAppErrorOfType(error, SchemaUpgradeConflictError)) {
          continue; // a write landed since we synced; re-fetch and retry
        }
        if (isAppErrorOfType(error, SchemaVersionMismatchError)) {
          await this.adoptAsStraggler(profileId); // lost the race
          return;
        }
        throw error;
      }

      // Adopt the now-upgraded cloud (equal to the merged result) so local matches it.
      await this.pullFromProfile(profileId);
      return;
    }
  }

  /**
   * User-scope first-upgrader, mirroring upgradeProfileSchema. Also the path that lifts a
   * fresh account store from its initial version to the local one before the first write.
   */
  private async upgradeUserSchema(): Promise<void> {
    const client = getApiClient();
    const localVersion = anoriVersionedSchema.currentVersion;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { user: head } = await client.sync.fullSync.query({ includeUser: true });
      assertValue(head, "fullSync response is missing the requested user scope");

      if (head.schemaVersion >= localVersion) {
        await this.pullUserScope();
        return;
      }
      const fromVersion = head.schemaVersion;

      const mutations = await this.buildUpgradeMutations(head.cells, fromVersion, "user");

      try {
        await client.sync.upgradeSchema.mutate({
          scope: "user",
          fromVersion,
          toVersion: localVersion,
          expectedSeq: head.latestSeq,
          mutations,
        });
      } catch (error) {
        if (isAppErrorOfType(error, SchemaUpgradeConflictError)) {
          continue;
        }
        if (isAppErrorOfType(error, SchemaVersionMismatchError)) {
          await this.pullUserScope();
          return;
        }
        throw error;
      }

      await this.pullUserScope();
      return;
    }
  }

  /**
   * Migrates the scope's cloud head to the local schema version and HLC-merges it with the
   * local export of the same scope.
   */
  private async buildUpgradeMutations(cells: RemoteCell[], fromVersion: number, scope: SyncScope) {
    const localVersion = anoriVersionedSchema.currentVersion;

    const cloudSnapshot: Record<string, StorageRecord<unknown>> = {};
    const fileKeys = new Set<string>();
    for (const cell of cells) {
      cloudSnapshot[cell.key] = {
        hlc: cell.hlc,
        value: cell.deleted ? null : cell.value,
        deleted: cell.deleted,
        brand: cell.brand,
      };
      if (cell.fileDownloadUrl !== null) fileKeys.add(cell.key);
    }

    const { snapshot: migrated } = await migrateSnapshot(
      anoriVersionedSchema,
      fromVersion,
      localVersion,
      cloudSnapshot,
      () => this.storage.sync.tickHlc(),
    );

    const { kv, files } = this.storage.sync.exportForFullSync(scope);
    const local: Record<string, StorageRecord<unknown>> = { ...kv };
    for (const [key, { record }] of Object.entries(files)) {
      local[key] = record;
      fileKeys.add(key);
    }

    const merged = mergeByHlc(migrated, local);

    // Every file cell keeps its server blob (fileRef:existing); no blob is uploaded here. A
    // migration that transforms file content, or an unsynced local file edit that wins the
    // merge, will NOT have its new blob propagated by the upgrade.
    return (
      Object.entries(merged)
        // Migrations run over the whole schema and may seed keys of the other scope; only
        // this scope's keys belong in its store.
        .filter(([key]) => getKeySyncMode(key) === scope)
        .map(([key, record]) => ({
          key,
          value: record.deleted ? null : record.value,
          deleted: record.deleted ?? false,
          hlc: record.hlc,
          brand: record.brand,
          fileRef: fileKeys.has(key) && !record.deleted ? ("existing" as const) : undefined,
        }))
    );
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
    this.storage.sync.enableOutbox("profile");
  }

  private async pullFromProfile(profileId: string): Promise<void> {
    const client = getApiClient();

    const { profile: remoteData } = await client.sync.fullSync.query({ profileId });
    assertValue(remoteData, "fullSync response is missing the requested profile scope");

    await this.adoptScopeData(remoteData, "profile");

    await this.storage.set(anoriSchema.cloudSyncSettings, {
      profileId,
      latestSeq: remoteData.latestSeq,
      profileSchemaVersion: remoteData.schemaVersion,
      // Adopting the cloud reconciles us to its schema version.
      syncedSchemaVersion: remoteData.schemaVersion,
    });

    this.refreshRemoteSubscriptions();
  }

  /** Adopts the cloud's user store wholesale (fresh pull or straggler recovery). */
  private async pullUserScope(): Promise<void> {
    const client = getApiClient();

    const { user: remoteData } = await client.sync.fullSync.query({ includeUser: true });
    assertValue(remoteData, "fullSync response is missing the requested user scope");

    await this.adoptScopeData(remoteData, "user");

    await this.storage.set(anoriSchema.cloudUserSyncState, {
      latestSeq: remoteData.latestSeq,
      userSchemaVersion: remoteData.schemaVersion,
      syncedSchemaVersion: remoteData.schemaVersion,
      ownerUserId: this.getAccountUserId(),
    });
  }

  /** Force-applies a scope's full-sync data locally (ignoring HLC) and clears its outbox. */
  private async adoptScopeData(remoteData: ScopeSyncData & { totalCount: number }, scope: SyncScope): Promise<void> {
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;

    const changes: Array<{
      key: string;
      record: StorageRecord<unknown>;
      schemaVersion: number;
    }> = [];
    const fileDownloads: Array<{
      key: string;
      fileDownloadUrl: string;
      path?: string;
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
          path: (cell.value as FileMetaValue<unknown> | null)?.path,
        });
      }
    }

    const fileBlobs = await downloadFileBlobs(fileDownloads);

    await this.storage.sync.applyRemoteChangesIgnoringHlc(changes, fileBlobs);
    await this.reconcileAfterFullSync(remoteData.cells, remoteData.totalCount, { protectOutbox: false, scope });
    await this.storage.sync.clearOutbox(scope);
  }

  private async pushToProfile(profileId: string): Promise<void> {
    const client = getApiClient();
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;

    const { kv, files } = this.storage.sync.exportForFullSync("profile");

    const syncedEntries: Array<{ key: string; hlc: HlcTimestamp }> = [];

    const kvMutations: KvMutation[] = Object.entries(kv).map(([key, record]) => ({
      key,
      value: record.deleted ? null : record.value,
      deleted: record.deleted ?? false,
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
        schemaVersion: currentSchemaVersion,
        profile: { profileId, mutations: kvMutations },
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
      profileSchemaVersion: anoriVersionedSchema.currentVersion,
      syncedSchemaVersion: anoriVersionedSchema.currentVersion,
    });

    this.refreshRemoteSubscriptions();
  }

  /**
   * Disconnects from the current profile and clears sync settings. User-scope sync keeps
   * running as long as the account is connected.
   */
  async disconnect(): Promise<void> {
    await this.storage.set(anoriSchema.cloudSyncSettings, null);
    this.storage.sync.disableOutbox("profile");

    const account = this.storage.get(anoriSchema.cloudAccount);
    if (account) {
      this.refreshRemoteSubscriptions();
      return;
    }

    this.storage.sync.disableOutbox("user");
    this.stop();
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
        this.flushPendingChanges();
      }, OUTBOX_FLUSH_DEBOUNCE_MS);
    };

    this.outboxUnsubscribe = this.storage.sync.subscribeToOutbox(handleChange);
  }

  /** Pushes whatever is pending in the outbox for every scope that is ready to flush. */
  async flushPendingChanges(): Promise<void> {
    if (this.isFlushingOutbox) {
      return;
    }

    this.isFlushingOutbox = true;
    try {
      const syncSettings = this.storage.get(anoriSchema.cloudSyncSettings);
      if (syncSettings) {
        await this.flushOutbox("profile", syncSettings.profileId);
      }
      if (this.storage.get(anoriSchema.cloudAccount)) {
        await this.flushOutbox("user");
      }
    } catch (error) {
      console.error("Failed to auto-sync outbox:", error);
    } finally {
      this.isFlushingOutbox = false;
    }
  }

  private teardownRemoteSubscriptions(): void {
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
      this.profileSubscription = null;
    }
    if (this.userCellsSubscription) {
      this.userCellsSubscription.unsubscribe();
      this.userCellsSubscription = null;
    }
  }

  /** Reconciles the WebSocket subscriptions with the current profile/account state. */
  private refreshRemoteSubscriptions(): void {
    this.teardownRemoteSubscriptions();

    const syncSettings = this.storage.get(anoriSchema.cloudSyncSettings);
    const account = this.storage.get(anoriSchema.cloudAccount);
    if (!syncSettings && !account) {
      return;
    }

    const client = this.getSubscriptionClient();

    if (syncSettings) {
      this.profileSubscription = client.client.sync.onProfileUpdates.subscribe(
        { profileId: syncSettings.profileId },
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

    if (account) {
      this.userCellsSubscription = client.client.sync.onUserCellUpdates.subscribe(undefined, {
        onData: async (event) => {
          if (event.type === "cellUpdated") {
            await this.applyRemoteCells([event.cell]);
          }
        },
        onError: (error) => {
          console.error("User cells subscription error:", error);
        },
      });
    }
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

  // We may flush only when the profile is at our schema version and we've reconciled there.
  // Otherwise pushing would be behind (rejected), ahead (rejected — a transition is pending), or
  // a straggler's stale edits (which a force-pull will discard).
  private isProfileSchemaReconciled(): boolean {
    const settings = this.storage.get(anoriSchema.cloudSyncSettings);
    if (!settings) return false;
    const localVersion = anoriVersionedSchema.currentVersion;
    return (
      (settings.profileSchemaVersion ?? localVersion) === localVersion &&
      (settings.syncedSchemaVersion ?? localVersion) === localVersion
    );
  }

  // The user store starts below the local version for every fresh account (it is created at
  // version 1), so unlike the profile check a missing state means "not reconciled yet" — the
  // first performSync upgrades the store and establishes it.
  private isUserSchemaReconciled(): boolean {
    const state = this.storage.get(anoriSchema.cloudUserSyncState);
    if (!state) return false;
    const localVersion = anoriVersionedSchema.currentVersion;
    return (
      (state.userSchemaVersion ?? localVersion) === localVersion &&
      (state.syncedSchemaVersion ?? localVersion) === localVersion
    );
  }

  private async flushOutbox(scope: SyncScope, profileId?: string): Promise<void> {
    if (scope === "profile" && (!profileId || !this.isProfileSchemaReconciled())) {
      return;
    }
    if (scope === "user" && !this.isUserSchemaReconciled()) {
      return;
    }

    const client = getApiClient();
    const currentSchemaVersion = anoriVersionedSchema.currentVersion;
    const outbox = this.storage.sync.exportOutbox()[scope];

    const writeKvScopePayload = (mutations: KvMutation[]) =>
      scope === "profile" && profileId ? { profile: { profileId, mutations } } : { user: { mutations } };
    const fileScopePayload = scope === "profile" ? { profileId } : { scope: "user" as const };

    const syncedEntries: Array<{ key: string; hlc: HlcTimestamp }> = [];

    for (const entry of outbox) {
      try {
        if (entry.type === "file") {
          if (entry.record.deleted) {
            const kvMutation: KvMutation = {
              key: entry.key,
              value: null,
              deleted: true,
              hlc: entry.record.hlc,
              brand: entry.record.brand,
            };
            await client.sync.writeKv.mutate({
              schemaVersion: currentSchemaVersion,
              ...writeKvScopePayload([kvMutation]),
            });
            syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
            continue;
          }

          const fileMeta = entry.record.value as FileMetaValue<unknown> | null;
          if (!fileMeta?.path) {
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
            ...fileScopePayload,
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
            ...fileScopePayload,
            uploadId,
            key: entry.key,
          });
          syncedEntries.push({ key: entry.key, hlc: entry.record.hlc });
        } else {
          const kvMutation: KvMutation = {
            key: entry.key,
            value: entry.record.deleted ? null : entry.record.value,
            deleted: entry.record.deleted ?? false,
            hlc: entry.record.hlc,
            brand: entry.record.brand,
          };

          await client.sync.writeKv.mutate({
            schemaVersion: currentSchemaVersion,
            ...writeKvScopePayload([kvMutation]),
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

  /**
   * Reconcile hard-removes the scope's local keys absent from a full-sync response, which is
   * how a stale client sheds values the server has purged.
   *
   * @param options.protectOutbox keep keys with pending local changes (true for the automatic
   *   fallback, false for an explicit pull which deliberately replaces local with the cloud).
   */
  private async reconcileAfterFullSync(
    cells: RemoteCell[],
    totalCount: number,
    options: { protectOutbox: boolean; scope: SyncScope },
  ): Promise<void> {
    if (cells.length !== totalCount) {
      console.warn(`Full-sync completeness check failed (${cells.length} != ${totalCount}); skipping reconcile`);
      return;
    }
    const serverKeys = new Set(cells.map((c) => c.key));
    const removed = await this.storage.sync.reconcileAgainstServerKeys(serverKeys, options);
    if (removed.length > 0) {
      console.log(`Reconcile removed ${removed.length} local key(s) absent from server`);
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
      path?: string;
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
          path: (cell.value as FileMetaValue<unknown> | null)?.path,
        });
      }
    }

    const fileBlobs = await downloadFileBlobs(fileDownloads);

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
 * Also enables each outbox scope whose destination is connected (profile / account).
 */
export function startSync(storage: AnoriStorage): void {
  if (storage.get(anoriSchema.cloudSyncSettings)) {
    storage.sync.enableOutbox("profile");
  }
  if (storage.get(anoriSchema.cloudAccount)) {
    storage.sync.enableOutbox("user");
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
 * Performs a sync cycle for every active scope (see SyncManager.performSync).
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
 * @param mode - 'pull' to overwrite local with remote, 'push' to overwrite remote with local
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
