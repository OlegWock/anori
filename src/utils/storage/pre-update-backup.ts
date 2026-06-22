import type { Storage } from "@anori/utils/storage-lib";
import { createBackupZip } from "./backup";

const BACKUPS_FOLDER = "anori-pre-update-backups";
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const FILENAME_RE = /^backup-(\d+)\.zip$/;

export type PreUpdateBackup = {
  blob: Blob;
  date: Date;
};

export function backupTimestamp(filename: string): number | null {
  const match = FILENAME_RE.exec(filename);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function getBackupsDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(BACKUPS_FOLDER, { create: true });
}

async function listBackupNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "file" && backupTimestamp(name) !== null) {
      names.push(name);
    }
  }
  return names;
}

export async function gcPreUpdateBackups(now = Date.now()): Promise<void> {
  const dir = await getBackupsDirectory();
  for (const name of await listBackupNames(dir)) {
    const ts = backupTimestamp(name);
    if (ts !== null && now - ts > RETENTION_MS) {
      await dir.removeEntry(name);
    }
  }
}

export async function capturePreUpdateBackup(storage: Storage): Promise<void> {
  const blob = await createBackupZip(storage);
  const dir = await getBackupsDirectory();
  const handle = await dir.getFileHandle(`backup-${Date.now()}.zip`, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  await gcPreUpdateBackups();
}

export async function getLatestPreUpdateBackup(): Promise<PreUpdateBackup | null> {
  await gcPreUpdateBackups();
  const dir = await getBackupsDirectory();
  const names = await listBackupNames(dir);
  if (names.length === 0) return null;

  const latest = names.reduce((a, b) => ((backupTimestamp(a) ?? 0) >= (backupTimestamp(b) ?? 0) ? a : b));
  const ts = backupTimestamp(latest);
  if (ts === null) return null;

  const file = await (await dir.getFileHandle(latest)).getFile();
  return { blob: file, date: new Date(ts) };
}
