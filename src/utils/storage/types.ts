import type { HlcTimestamp } from "./hlc";

export type StorageRecord<T> = {
  brand?: string;
  hlc: HlcTimestamp;
  deleted?: boolean;
  value: T | null;
};

export type FileMetaRecord<P = unknown> = {
  hlc: HlcTimestamp;
  deleted?: boolean;
  properties?: P;
  path: string;
};
