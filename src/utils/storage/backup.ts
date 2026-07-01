import { readFile, type Storage } from "@anori/utils/storage-lib";
import moment from "moment-timezone";
import browser from "webextension-polyfill";
import { anoriSchema, anoriVersionedSchema } from "./schema";

export const BACKUP_FORMAT_VERSION = 1;

export type BackupMeta = {
  formatVersion: number;
  extensionVersion: string;
  schemaVersion: number;
  date: string;
};

export async function createBackupZip(storage: Storage): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const { kv, files } = storage.exportForBackup();

  const exportableStorage: Record<string, unknown> = {};
  for (const [key, record] of Object.entries(kv)) {
    exportableStorage[key] = record;
  }
  for (const [key, { record }] of Object.entries(files)) {
    exportableStorage[key] = record;
  }

  const meta: BackupMeta = {
    formatVersion: BACKUP_FORMAT_VERSION,
    extensionVersion: browser.runtime.getManifest().version,
    schemaVersion: anoriVersionedSchema.currentVersion,
    date: moment().toISOString(),
  };

  zip.file("storage.json", JSON.stringify(exportableStorage, null, 2), { compression: "DEFLATE" });
  zip.file("meta.json", JSON.stringify(meta, null, 2), { compression: "DEFLATE" });

  for (const { record, path } of Object.values(files)) {
    if (record.deleted) continue;
    const blob = await readFile(path);
    if (blob) {
      zip.file(`opfs/${path}`, blob, { compression: "DEFLATE" });
    }
  }

  return zip.generateAsync({ type: "blob" });
}

export async function restoreBackupFromZip(storage: Storage, zipBlob: Blob): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(zipBlob);

  const metaJsonFile = zip.file("meta.json");
  if (!metaJsonFile) {
    throw new Error("Invalid backup: missing meta.json");
  }
  const backupMeta = JSON.parse(await metaJsonFile.async("string")) as Partial<BackupMeta>;
  if (backupMeta.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format version: ${backupMeta.formatVersion}. Expected ${BACKUP_FORMAT_VERSION}. This backup was created with a different version of Anori.`,
    );
  }
  const backupSchemaVersion = backupMeta.schemaVersion ?? anoriVersionedSchema.currentVersion;

  const storageFile = zip.file("storage.json");
  if (!storageFile) {
    throw new Error("Invalid backup: missing storage.json");
  }
  const storageData = JSON.parse(await storageFile.async("string")) as Record<string, unknown>;

  const fileBlobs = new Map<string, Blob>();
  const opfsFolder = zip.folder("opfs");
  if (opfsFolder) {
    const opfsFiles = opfsFolder.filter(() => true);
    for (const opfsFile of opfsFiles) {
      const path = opfsFile.name.replace(/^opfs\//, "");
      const blob = await opfsFile.async("blob");
      fileBlobs.set(path, blob);
    }
  }

  // Preserve cloud account credentials so user stays logged in
  const currentCloudAccount = storage.get(anoriSchema.cloudAccount);

  await storage.importFromBackup({ kv: storageData, fileBlobs, schemaVersion: backupSchemaVersion });

  if (currentCloudAccount) {
    await storage.set(anoriSchema.cloudAccount, currentCloudAccount);
  }
}
