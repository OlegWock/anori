import browser from "webextension-polyfill";
import { deleteFile, listFiles, writeFile } from "./opfs";
import type { StorageInternalContext } from "./storage-types";
import { type FileMetaValue, type StorageRecord, isStorageRecord } from "./types";

export function createBackupInterface(ctx: StorageInternalContext) {
  return {
    exportForBackup(): {
      kv: Record<string, StorageRecord<unknown>>;
      files: Record<string, { record: StorageRecord<FileMetaValue<unknown>>; path: string }>;
    } {
      ctx.ensureInitialized();
      const kv: Record<string, StorageRecord<unknown>> = {};
      const files: Record<string, { record: StorageRecord<FileMetaValue<unknown>>; path: string }> = {};

      for (const [key, value] of Object.entries(ctx.cache)) {
        if (!isStorageRecord(value)) continue;
        if (!ctx.isKeyBackupEligible(key)) continue;

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

    async importFromBackup(data: {
      kv: Record<string, StorageRecord<unknown>>;
      fileBlobs: Map<string, Blob>;
    }): Promise<void> {
      ctx.ensureInitialized();

      // Clear existing OPFS files
      const existingFiles = await listFiles();
      await Promise.all(existingFiles.map((filename) => deleteFile(filename)));

      // Write new OPFS files from backup
      for (const [path, blob] of data.fileBlobs) {
        await writeFile(path, blob);
      }

      // Replace all browser storage with backup data
      await browser.storage.local.clear();
      await browser.storage.local.set(data.kv);
    },
  };
}
