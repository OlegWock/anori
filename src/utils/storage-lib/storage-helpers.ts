import { isKeyMatchingPrefix } from "./query";
import { isCellDescriptor } from "./schema/cell";
import { isCollectionDescriptor } from "./schema/collection";
import { isFileCollectionDescriptor, isFileDescriptor } from "./schema/file";
import type { SchemaDefinition } from "./schema/version";

export function createSchemaHelpers(definition: SchemaDefinition) {
  function isKeyTracked(key: string): boolean {
    for (const descriptor of Object.values(definition)) {
      if (isCellDescriptor(descriptor) || isFileDescriptor(descriptor)) {
        if (descriptor.key === key && descriptor.tracked) {
          return true;
        }
      } else if (isCollectionDescriptor(descriptor) || isFileCollectionDescriptor(descriptor)) {
        if (isKeyMatchingPrefix(key, descriptor.keyPrefix) && descriptor.tracked) {
          return true;
        }
      }
    }
    return false;
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

  return { isKeyTracked, isKeyBackupEligible, isFileKey };
}
