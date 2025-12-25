import type { EntityDescriptor } from "./entity";

export const COLLECTION_TYPE = Symbol("collection");
export const COLLECTION_QUERY_TYPE = Symbol("collectionQuery");

type CollectionOptions<E extends Record<string, EntityDescriptor>> = {
  keyPrefix: string;
  entities: E;
  tracked: boolean;
};

type EntityValueTypes<E extends Record<string, EntityDescriptor>> = {
  [K in keyof E]: E[K]["_valueType"];
};

type UnionOfValues<T> = T[keyof T];

export type CollectionAllQuery<T = unknown> = {
  readonly _type: typeof COLLECTION_QUERY_TYPE;
  readonly _valueType: T;
  readonly queryType: "all";
  readonly keyPrefix: string;
  readonly brand?: string;
  readonly tracked: boolean;
};

export type CollectionByIdQuery<T = unknown> = {
  readonly _type: typeof COLLECTION_QUERY_TYPE;
  readonly _valueType: T;
  readonly queryType: "byId";
  readonly keyPrefix: string;
  readonly id: string;
  readonly brand?: string;
  readonly tracked: boolean;
};

export type CollectionQuery<T = unknown> = CollectionAllQuery<T> | CollectionByIdQuery<T>;

export type EntityAccessor<T = unknown> = {
  all(): CollectionAllQuery<T>;
  byId(id: string): CollectionByIdQuery<T>;
};

export type CollectionDescriptorBase = {
  readonly _type: typeof COLLECTION_TYPE;
  readonly _valueType: unknown;
  readonly keyPrefix: string;
  readonly entities: Record<string, EntityDescriptor>;
  readonly tracked: boolean;
};

export type CollectionDescriptor<E extends Record<string, EntityDescriptor> = Record<string, EntityDescriptor>> =
  CollectionDescriptorBase & {
    readonly _valueType: UnionOfValues<EntityValueTypes<E>>;
    readonly entities: E;
    all(): CollectionAllQuery<UnionOfValues<EntityValueTypes<E>>>;
    byId(id: string): CollectionByIdQuery<UnionOfValues<EntityValueTypes<E>>>;
  } & {
    readonly [K in keyof E]: EntityAccessor<E[K]["_valueType"]>;
  };

export function collection<E extends Record<string, EntityDescriptor>>(
  options: CollectionOptions<E>,
): CollectionDescriptor<E> {
  const keyPrefix = options.keyPrefix;

  const entityAccessors = {} as { [K in keyof E]: EntityAccessor<E[K]["_valueType"]> };
  const tracked = options.tracked;

  for (const [name, entityDesc] of Object.entries(options.entities)) {
    entityAccessors[name as keyof E] = {
      all(): CollectionAllQuery<E[keyof E]["_valueType"]> {
        return {
          _type: COLLECTION_QUERY_TYPE,
          _valueType: undefined as unknown as E[keyof E]["_valueType"],
          queryType: "all",
          keyPrefix,
          brand: entityDesc.brand,
          tracked,
        };
      },
      byId(id: string): CollectionByIdQuery<E[keyof E]["_valueType"]> {
        return {
          _type: COLLECTION_QUERY_TYPE,
          _valueType: undefined as unknown as E[keyof E]["_valueType"],
          queryType: "byId",
          keyPrefix,
          id,
          brand: entityDesc.brand,
          tracked,
        };
      },
    };
  }

  return {
    _type: COLLECTION_TYPE,
    _valueType: undefined as unknown as UnionOfValues<EntityValueTypes<E>>,
    keyPrefix,
    entities: options.entities,
    tracked: options.tracked,

    all(): CollectionAllQuery<UnionOfValues<EntityValueTypes<E>>> {
      return {
        _type: COLLECTION_QUERY_TYPE,
        _valueType: undefined as unknown as UnionOfValues<EntityValueTypes<E>>,
        queryType: "all",
        keyPrefix,
        tracked,
      };
    },

    byId(id: string): CollectionByIdQuery<UnionOfValues<EntityValueTypes<E>>> {
      return {
        _type: COLLECTION_QUERY_TYPE,
        _valueType: undefined as unknown as UnionOfValues<EntityValueTypes<E>>,
        queryType: "byId",
        keyPrefix,
        id,
        tracked,
      };
    },

    ...entityAccessors,
  } as CollectionDescriptor<E>;
}

export function isCollectionDescriptor(value: unknown): value is CollectionDescriptor {
  return typeof value === "object" && value !== null && "_type" in value && value._type === COLLECTION_TYPE;
}

export function isCollectionQuery(value: unknown): value is CollectionQuery<unknown> {
  return typeof value === "object" && value !== null && "_type" in value && value._type === COLLECTION_QUERY_TYPE;
}

export function isCollectionAllQuery(value: unknown): value is CollectionAllQuery<unknown> {
  return isCollectionQuery(value) && value.queryType === "all";
}

export function isCollectionByIdQuery(value: unknown): value is CollectionByIdQuery<unknown> {
  return isCollectionQuery(value) && value.queryType === "byId";
}
