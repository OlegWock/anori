import { deleteFile, generateFilePath, readFile, writeFile } from "./opfs";
import type { FileCollectionAllQuery, FileCollectionByIdQuery, FileDescriptor } from "./schema/file";
import type { FileMetaValue } from "./types";

export type FileQuery<P = unknown> = FileDescriptor<P> | FileCollectionByIdQuery<P> | FileCollectionAllQuery<P>;
export type SingleFileQuery<P = unknown> = FileDescriptor<P> | FileCollectionByIdQuery<P>;

export type FileWithMeta<P = unknown> = {
  blob: Blob;
  meta: FileMetaValue<P>;
};

export type FilesStorage = {
  get<P>(query: FileDescriptor<P>): Promise<FileWithMeta<P> | undefined>;
  get<P>(query: FileCollectionByIdQuery<P>): Promise<FileWithMeta<P> | undefined>;
  get<P>(query: FileCollectionAllQuery<P>): Promise<Record<string, FileWithMeta<P>>>;

  getMeta<P>(query: FileDescriptor<P>): FileMetaValue<P> | undefined;
  getMeta<P>(query: FileCollectionByIdQuery<P>): FileMetaValue<P> | undefined;
  getMeta<P>(query: FileCollectionAllQuery<P>): Record<string, FileMetaValue<P>>;

  getBlob(path: string): Promise<Blob | null>;

  set<P>(query: FileDescriptor<P>, blob: Blob, properties?: P): Promise<void>;
  set<P>(query: FileCollectionByIdQuery<P>, blob: Blob, properties?: P): Promise<void>;

  updateBlob(query: FileDescriptor, blob: Blob): Promise<void>;
  updateBlob(query: FileCollectionByIdQuery, blob: Blob): Promise<void>;

  updateProperties<P>(query: FileDescriptor<P>, properties: P): Promise<void>;
  updateProperties<P>(query: FileCollectionByIdQuery<P>, properties: P): Promise<void>;

  delete(query: FileDescriptor): Promise<void>;
  delete(query: FileCollectionByIdQuery): Promise<void>;
};

export type FilesStorageInternals = {
  getMeta(query: FileQuery): unknown;
  setMeta(query: SingleFileQuery, value: FileMetaValue): Promise<void>;
  deleteMeta(query: SingleFileQuery): Promise<void>;
};

export function createFilesStorage(internals: FilesStorageInternals): FilesStorage {
  function getSingleMeta<P>(query: SingleFileQuery<P>): FileMetaValue<P> | undefined {
    return internals.getMeta(query) as FileMetaValue<P> | undefined;
  }

  function getAllMeta<P>(query: FileCollectionAllQuery<P>): Record<string, FileMetaValue<P>> {
    return internals.getMeta(query) as Record<string, FileMetaValue<P>>;
  }

  const filesStorage = {
    async get<P>(
      query: FileDescriptor<P> | FileCollectionByIdQuery<P> | FileCollectionAllQuery<P>,
    ): Promise<FileWithMeta<P> | undefined | Record<string, FileWithMeta<P>>> {
      if ("queryType" in query && query.queryType === "all") {
        const allMeta = getAllMeta(query);
        const entries = Object.entries(allMeta);

        const blobResults = await Promise.all(entries.map(([, meta]) => readFile(meta.path)));

        const result: Record<string, FileWithMeta<P>> = {};
        for (let i = 0; i < entries.length; i++) {
          const [id, meta] = entries[i];
          const blob = blobResults[i];
          if (blob) {
            result[id] = { blob, meta };
          }
        }

        return result;
      }

      const meta = getSingleMeta(query as SingleFileQuery<P>);
      if (!meta) return undefined;

      const blob = await readFile(meta.path);
      if (!blob) return undefined;

      return { blob, meta };
    },

    getMeta<P>(
      query: FileDescriptor<P> | FileCollectionByIdQuery<P> | FileCollectionAllQuery<P>,
    ): FileMetaValue<P> | undefined | Record<string, FileMetaValue<P>> {
      if ("queryType" in query && query.queryType === "all") {
        return getAllMeta(query);
      }

      return getSingleMeta(query as SingleFileQuery<P>);
    },

    async getBlob(path: string): Promise<Blob | null> {
      return readFile(path);
    },

    async set<P>(query: SingleFileQuery<P>, blob: Blob, properties?: P): Promise<void> {
      const existingMeta = getSingleMeta(query);
      const path = existingMeta?.path ?? generateFilePath();
      await writeFile(path, blob);

      const meta: FileMetaValue<P> = {
        path,
        properties,
      };

      await internals.setMeta(query, meta as FileMetaValue);
    },

    async updateBlob(query: SingleFileQuery, blob: Blob): Promise<void> {
      const existingMeta = getSingleMeta(query);
      if (!existingMeta) {
        throw new Error("File not found");
      }

      await writeFile(existingMeta.path, blob);

      const meta: FileMetaValue = {
        path: existingMeta.path,
        properties: existingMeta.properties,
      };

      await internals.setMeta(query, meta);
    },

    async updateProperties<P>(query: SingleFileQuery<P>, properties: P): Promise<void> {
      const existingMeta = getSingleMeta(query);
      if (!existingMeta) {
        throw new Error("File not found");
      }

      const meta: FileMetaValue<P> = {
        path: existingMeta.path,
        properties,
      };

      await internals.setMeta(query, meta as FileMetaValue);
    },

    async delete(query: SingleFileQuery): Promise<void> {
      const existingMeta = getSingleMeta(query);

      if (existingMeta) {
        await deleteFile(existingMeta.path);
      }

      await internals.deleteMeta(query);
    },
  };

  return filesStorage as FilesStorage;
}
