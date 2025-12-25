import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { cell, defineSchemaVersion, defineVersionedSchema } from "../schema";
import type { Storage } from "../storage";

describe("Cell default value type inference", () => {
  const schemaV1 = defineSchemaVersion(1, {
    withDefault: cell({
      key: "withDefault",
      schema: z.string(),
      defaultValue: "hello",
      tracked: true,
    }),
    withoutDefault: cell({
      key: "withoutDefault",
      schema: z.string(),
      tracked: true,
    }),
    withUndefinedDefault: cell({
      key: "withUndefinedDefault",
      schema: z.string().optional(),
      defaultValue: undefined,
      tracked: true,
    }),
    arrayWithDefault: cell({
      key: "arrayWithDefault",
      schema: z.array(z.string()),
      defaultValue: [],
      tracked: true,
    }),
  });

  const testSchema = defineVersionedSchema({ versions: [schemaV1], migrations: [] });
  type TestStorage = Storage<typeof testSchema>;

  it("should infer T for cells with default value", () => {
    type WithDefaultResult = ReturnType<TestStorage["get"]> extends infer R ? (R extends string ? true : false) : never;

    // Cell with defaultValue should have _hasDefault: true
    expectTypeOf(schemaV1.definition.withDefault._hasDefault).toEqualTypeOf<true>();

    // Cell without defaultValue should have _hasDefault: false
    expectTypeOf(schemaV1.definition.withoutDefault._hasDefault).toEqualTypeOf<false>();
  });

  it("should infer correct return type for get()", () => {
    // We use a function to test the overload resolution
    function testGet(storage: TestStorage) {
      const withDefault = storage.get(schemaV1.definition.withDefault);
      expectTypeOf(withDefault).toEqualTypeOf<string>();

      const withoutDefault = storage.get(schemaV1.definition.withoutDefault);
      expectTypeOf(withoutDefault).toEqualTypeOf<string | undefined>();

      const arrayWithDefault = storage.get(schemaV1.definition.arrayWithDefault);
      expectTypeOf(arrayWithDefault).toEqualTypeOf<string[]>();
    }

    // Type check passes if this compiles
    testGet as unknown;
  });

  it("should infer correct return type for getWithMeta()", () => {
    function testGetWithMeta(storage: TestStorage) {
      const withDefault = storage.getWithMeta(schemaV1.definition.withDefault);
      expectTypeOf(withDefault.value).toEqualTypeOf<string>();

      const withoutDefault = storage.getWithMeta(schemaV1.definition.withoutDefault);
      expectTypeOf(withoutDefault.value).toEqualTypeOf<string | undefined>();
    }

    testGetWithMeta as unknown;
  });

  it("should treat defaultValue: undefined as having a default when schema allows undefined", () => {
    // When schema is z.string().optional() (T = string | undefined) and defaultValue: undefined,
    // this IS providing a default value (undefined), so _hasDefault is true.
    // The return type is still string | undefined (same as T).
    expectTypeOf(schemaV1.definition.withUndefinedDefault._hasDefault).toEqualTypeOf<true>();

    function testUndefinedDefault(storage: TestStorage) {
      const result = storage.get(schemaV1.definition.withUndefinedDefault);
      // Returns T which is string | undefined (the default undefined is a valid value)
      expectTypeOf(result).toEqualTypeOf<string | undefined>();
    }

    testUndefinedDefault as unknown;
  });
});
