import type { z } from "zod";

export const CELL_TYPE = Symbol("cell");

export type CellOptions<T> = {
  key: string;
  schema: z.ZodType<T>;
  defaultValue?: T;
  tracked: boolean;
};

export type CellDescriptor<T = unknown> = {
  readonly _type: typeof CELL_TYPE;
  readonly _valueType: T;
  readonly key: string;
  readonly schema: z.ZodType<T>;
  readonly defaultValue: T | undefined;
  readonly tracked: boolean;
};

export type CellQuery<T> = {
  readonly _type: typeof CELL_TYPE;
  readonly _valueType: T;
  readonly key: string;
};

export function cell<T>(options: CellOptions<T>): CellDescriptor<T> {
  return {
    _type: CELL_TYPE,
    _valueType: undefined as unknown as T,
    key: options.key,
    schema: options.schema,
    defaultValue: options.defaultValue,
    tracked: options.tracked,
  };
}

export function isCellDescriptor(value: unknown): value is CellDescriptor {
  return typeof value === "object" && value !== null && "_type" in value && value._type === CELL_TYPE;
}

export function isCellQuery(value: unknown): value is CellQuery<unknown> {
  return isCellDescriptor(value);
}
