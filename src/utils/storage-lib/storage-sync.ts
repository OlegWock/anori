import { type HlcTimestamp, compareHlc } from "./hlc";
import { deleteFile, writeFile } from "./opfs";
import type {
  Outbox,
  OutboxChangeCallback,
  OutboxSubscription,
  Storage,
  StorageInternalContext,
} from "./storage-types";
import { type FileMetaValue, type StorageRecord, isStorageRecord } from "./types";

export function createSyncInterface(ctx: StorageInternalContext): Storage["sync"] {
  return {
    isOutboxEnabled(): boolean {
      return ctx.getOutboxEnabled();
    },

    enableOutbox(): void {
      // This is handled by the main storage - we just delegate
      // The actual flag is managed in createStorage
    },

    disableOutbox(): void {
      // Same as enableOutbox - delegated
    },

    getOutbox(): Outbox {
      ctx.ensureInitialized();
      return ctx.getOutboxFromCache();
    },

    async removeFromOutbox(entries: Array<{ key: string; hlc: HlcTimestamp }>): Promise<void> {
      ctx.ensureInitialized();
      const outbox = ctx.getOutboxFromCache();
      const filtered = outbox.filter((outboxEntry) => {
        const matchingEntry = entries.find(
          (e) => e.key === outboxEntry.key && compareHlc(e.hlc, outboxEntry.hlc) === 0,
        );
        return !matchingEntry;
      });
      ctx.persistOutbox(filtered);
      await ctx.waitForPersist();
    },

    async clearOutbox(): Promise<void> {
      ctx.ensureInitialized();
      ctx.persistOutbox([]);
      await ctx.waitForPersist();
    },

    subscribeToOutbox(callback: OutboxChangeCallback): () => void {
      const subscription: OutboxSubscription = { callback };
      ctx.outboxSubscriptions.push(subscription);

      return () => {
        const index = ctx.outboxSubscriptions.indexOf(subscription);
        if (index >= 0) {
          ctx.outboxSubscriptions.splice(index, 1);
        }
      };
    },

    exportForFullSync(): {
      kv: Record<string, StorageRecord<unknown>>;
      files: Record<string, { record: StorageRecord<FileMetaValue<unknown>>; path: string }>;
    } {
      ctx.ensureInitialized();
      const kv: Record<string, StorageRecord<unknown>> = {};
      const files: Record<string, { record: StorageRecord<FileMetaValue<unknown>>; path: string }> = {};

      for (const [key, value] of Object.entries(ctx.cache)) {
        if (!isStorageRecord(value)) continue;
        if (!ctx.isKeyTracked(key)) continue;

        if (ctx.isFileKey(key)) {
          const fileRecord = value as StorageRecord<FileMetaValue<unknown>>;
          const fileMeta = fileRecord.value;
          if (fileMeta?.path) {
            files[key] = { record: fileRecord, path: fileMeta.path };
          }
        } else {
          kv[key] = value;
        }
      }

      return { kv, files };
    },

    exportOutbox() {
      ctx.ensureInitialized();
      const outbox = ctx.getOutboxFromCache();
      const result: Array<{ key: string; type: "file" | "kv"; record: StorageRecord<unknown> }> = [];

      for (const entry of outbox) {
        const record = ctx.cache[entry.key];
        if (isStorageRecord(record)) {
          result.push({ key: entry.key, type: entry.type, record });
        }
      }

      return result;
    },

    async mergeRemoteChanges(
      changes: { key: string; record: StorageRecord<unknown>; schemaVersion: number }[],
      fileBlobs?: Map<string, Blob>,
    ): Promise<{ applied: string[]; skipped: string[] }> {
      ctx.ensureInitialized();
      const applied: string[] = [];
      const skipped: string[] = [];

      for (const { key, record, schemaVersion } of changes) {
        // Skip if schema version doesn't match
        if (schemaVersion !== ctx.currentSchemaVersion) {
          skipped.push(key);
          continue;
        }

        // Get local record
        const localValue = ctx.cache[key];
        const localRecord = isStorageRecord(localValue) ? localValue : undefined;

        // Compare HLC - remote wins if newer
        const shouldApply = !localRecord || compareHlc(record.hlc, localRecord.hlc) > 0;

        if (shouldApply) {
          await applyFileChanges(ctx, key, record, fileBlobs);
          ctx.persistRecord(key, record, { notifyAs: "remote" });
          applied.push(key);
        } else {
          skipped.push(key);
        }

        // Update local HLC with remote timestamp (even if not applied)
        ctx.getHlc().receive(record.hlc);
      }

      ctx.persistHlcState();
      await ctx.waitForPersist();
      return { applied, skipped };
    },

    async applyRemoteChangesIgnoringHlc(
      changes: { key: string; record: StorageRecord<unknown>; schemaVersion: number }[],
      fileBlobs?: Map<string, Blob>,
    ): Promise<{ applied: string[]; skipped: string[] }> {
      ctx.ensureInitialized();
      const applied: string[] = [];
      const skipped: string[] = [];

      for (const { key, record, schemaVersion } of changes) {
        if (schemaVersion !== ctx.currentSchemaVersion) {
          skipped.push(key);
          continue;
        }

        await applyFileChanges(ctx, key, record, fileBlobs);
        ctx.persistRecord(key, record, { notifyAs: "remote" });
        applied.push(key);

        ctx.getHlc().receive(record.hlc);
      }

      ctx.persistHlcState();
      await ctx.waitForPersist();
      return { applied, skipped };
    },
  };
}

async function applyFileChanges(
  ctx: StorageInternalContext,
  key: string,
  record: StorageRecord<unknown>,
  fileBlobs?: Map<string, Blob>,
): Promise<void> {
  if (!ctx.isFileKey(key)) return;

  const localValue = ctx.cache[key];
  const localRecord = isStorageRecord(localValue) ? localValue : undefined;
  const oldFileMeta = localRecord?.value as FileMetaValue<unknown> | undefined;
  const newFileMeta = record.value as FileMetaValue<unknown> | null;

  // Delete old file if it exists and path is changing or file is being deleted
  if (oldFileMeta?.path) {
    const pathChanging = newFileMeta && newFileMeta.path !== oldFileMeta.path;
    const fileDeleting = record.deleted;

    if (pathChanging || fileDeleting) {
      try {
        await deleteFile(oldFileMeta.path);
      } catch (error) {
        console.error(`Failed to delete old file at ${oldFileMeta.path}:`, error);
      }
    }
  }

  // Write new file if provided
  if (!record.deleted && newFileMeta?.path && fileBlobs) {
    const blob = fileBlobs.get(key);
    if (blob) {
      try {
        await writeFile(newFileMeta.path, blob);
      } catch (error) {
        console.error(`Failed to write file at ${newFileMeta.path}:`, error);
      }
    }
  }
}
