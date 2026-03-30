import type { CellDescriptor } from "./cell";
import type { CollectionDescriptorBase } from "./collection";
import type { FileCollectionDescriptor, FileDescriptor } from "./file";

export type SchemaEntry =
  // biome-ignore lint/suspicious/noExplicitAny: Generic types need any to preserve type info through schema definition
  | CellDescriptor<any>
  | CollectionDescriptorBase
  // biome-ignore lint/suspicious/noExplicitAny: Generic types need any to preserve type info through schema definition
  | FileDescriptor<any>
  // biome-ignore lint/suspicious/noExplicitAny: Generic types need any to preserve type info through schema definition
  | FileCollectionDescriptor<any>;

export type SchemaDefinition = Record<string, SchemaEntry>;

export type SchemaVersion<V extends number = number, S extends SchemaDefinition = SchemaDefinition> = {
  readonly version: V;
  readonly definition: S;
};

export function defineSchemaVersion<V extends number, S extends SchemaDefinition>(
  version: V,
  schema: S,
): SchemaVersion<V, S> {
  return {
    version,
    definition: schema,
  };
}
