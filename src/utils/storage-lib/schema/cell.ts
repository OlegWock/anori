import type { z } from "zod";

const CELL_TYPE = Symbol("cell");

type CellOptionsWithDefault<T> = {
  key: string;
  schema: z.ZodType<T>;
  defaultValue: T;
  tracked: boolean;
  includedInBackup: boolean;
};

type CellOptionsWithoutDefault<T> = {
  key: string;
  schema: z.ZodType<T>;
  defaultValue?: undefined;
  tracked: boolean;
  includedInBackup: boolean;
};

type CellOptions<T> = CellOptionsWithDefault<T> | CellOptionsWithoutDefault<T>;

export type CellDescriptor<T = unknown, HasDefault extends boolean = boolean> = {
  readonly _type: typeof CELL_TYPE;
  readonly _valueType: T;
  readonly _hasDefault: HasDefault;
  readonly key: string;
  readonly schema: z.ZodType<T>;
  readonly defaultValue: HasDefault extends true ? T : undefined;
  readonly tracked: boolean;
  readonly includedInBackup: boolean;
};

export type CellQuery<T> = {
  readonly _type: typeof CELL_TYPE;
  readonly _valueType: T;
  readonly key: string;
};

export function cell<T>(options: CellOptionsWithDefault<T>): CellDescriptor<T, true>;
export function cell<T>(options: CellOptionsWithoutDefault<T>): CellDescriptor<T, false>;
export function cell<T>(options: CellOptions<T>): CellDescriptor<T, boolean> {
  const hasDefault = "defaultValue" in options && options.defaultValue !== undefined;
  return {
    _type: CELL_TYPE,
    _valueType: undefined as unknown as T,
    _hasDefault: hasDefault,
    key: options.key,
    schema: options.schema,
    defaultValue: options.defaultValue,
    tracked: options.tracked,
    includedInBackup: options.includedInBackup,
  } as CellDescriptor<T, boolean>;
}

export function isCellDescriptor(value: unknown): value is CellDescriptor {
  return typeof value === "object" && value !== null && "_type" in value && value._type === CELL_TYPE;
}

export function isCellQuery(value: unknown): value is CellQuery<unknown> {
  return isCellDescriptor(value);
}
