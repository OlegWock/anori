import type { z } from "zod";

export const ENTITY_TYPE = Symbol("entity");

type EntityOptions<T> = {
  brand: string;
  schema: z.ZodType<T>;
};

export type EntityDescriptor<T = unknown> = {
  readonly _type: typeof ENTITY_TYPE;
  readonly _valueType: T;
  readonly brand: string;
  readonly schema: z.ZodType<T>;
};

export function entity<T>(options: EntityOptions<T>): EntityDescriptor<T> {
  return {
    _type: ENTITY_TYPE,
    _valueType: undefined as unknown as T,
    brand: options.brand,
    schema: options.schema,
  };
}

export function isEntityDescriptor(value: unknown): value is EntityDescriptor {
  return typeof value === "object" && value !== null && "_type" in value && value._type === ENTITY_TYPE;
}
