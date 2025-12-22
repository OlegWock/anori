export {
  type HlcTimestamp,
  type HlcState,
  type Hlc,
  createHlc,
  generateNodeId,
  compareHlc,
  serializeHlc,
  deserializeHlc,
} from "./hlc";

export type { StorageRecord, FileMetaRecord } from "./types";
