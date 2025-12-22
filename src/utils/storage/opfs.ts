const STORAGE_FOLDER_NAME = "anori-managed-storage";

async function getStorageDirectory(): Promise<FileSystemDirectoryHandle> {
  const opfsRoot = await navigator.storage.getDirectory();
  return opfsRoot.getDirectoryHandle(STORAGE_FOLDER_NAME, { create: true });
}

export function generateFilePath(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export async function writeFile(path: string, blob: Blob): Promise<void> {
  const dir = await getStorageDirectory();
  const fileHandle = await dir.getFileHandle(path, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function readFile(path: string): Promise<Blob | null> {
  try {
    const dir = await getStorageDirectory();
    const fileHandle = await dir.getFileHandle(path);
    const file = await fileHandle.getFile();
    return file;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }
    throw error;
  }
}

export async function deleteFile(path: string): Promise<boolean> {
  try {
    const dir = await getStorageDirectory();
    await dir.removeEntry(path);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return false;
    }
    throw error;
  }
}

export async function listFiles(): Promise<string[]> {
  const dir = await getStorageDirectory();
  const files: string[] = [];

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "file") {
      files.push(name);
    }
  }

  return files;
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    const dir = await getStorageDirectory();
    await dir.getFileHandle(path);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return false;
    }
    throw error;
  }
}
