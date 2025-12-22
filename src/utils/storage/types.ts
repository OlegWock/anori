import type { HlcTimestamp } from "./hlc";

export type StorageRecord<T> = {
  brand?: string;
  hlc: HlcTimestamp;
  deleted?: boolean;
  value: T | null;
};

export type FileMetaValue<P = unknown> = {
  path: string;
  properties?: P;
};
