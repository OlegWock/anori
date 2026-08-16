import { isKeyMatchingPrefix } from "./query";
import { isCellDescriptor } from "./schema/cell";
import { isCollectionDescriptor } from "./schema/collection";
import { isFileCollectionDescriptor, isFileDescriptor } from "./schema/file";
import type { SyncMode } from "./schema/sync-mode";
import type { SchemaDefinition } from "./schema/version";

export function createSchemaHelpers(definition: SchemaDefinition) {
  function getKeySyncMode(key: string): SyncMode {
    for (const descriptor of Object.values(definition)) {
      if (isCellDescriptor(descriptor) || isFileDescriptor(descriptor)) {
        if (descriptor.key === key) {
          return descriptor.sync;
        }
      } else if (isCollectionDescriptor(descriptor) || isFileCollectionDescriptor(descriptor)) {
        if (isKeyMatchingPrefix(key, descriptor.keyPrefix)) {
          return descriptor.sync;
        }
      }
    }
    return "off";
  }

  function isKeyTracked(key: string): boolean {
    return getKeySyncMode(key) !== "off";
  }

  function isKeyBackupEligible(key: string): boolean {
    for (const descriptor of Object.values(definition)) {
      if (isCellDescriptor(descriptor) || isFileDescriptor(descriptor)) {
        if (descriptor.key === key) {
          return descriptor.includedInBackup;
        }
      } else if (isCollectionDescriptor(descriptor) || isFileCollectionDescriptor(descriptor)) {
        if (isKeyMatchingPrefix(key, descriptor.keyPrefix)) {
          return descriptor.includedInBackup;
        }
      }
    }
    // Unknown keys (not in schema) are included by default
    return true;
  }

  function isFileKey(key: string): boolean {
    for (const descriptor of Object.values(definition)) {
      if (isFileDescriptor(descriptor) && descriptor.key === key) {
        return true;
      }

      if (isFileCollectionDescriptor(descriptor) && isKeyMatchingPrefix(key, descriptor.keyPrefix)) {
        return true;
      }
    }
    return false;
  }

  return { getKeySyncMode, isKeyTracked, isKeyBackupEligible, isFileKey };
}
