/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { z } from "zod";
import { type MockBrowserStorageState, createMockBrowserStorage, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import { clearAtomCache, getGlobalStorage, setGlobalStorage, useStorageValue } from "../react";
import { cell, collection, defineSchemaVersion, defineVersionedSchema, entity } from "../schema";
import { createStorage } from "../storage";

function createTestSchema() {
  const schemaV1 = defineSchemaVersion(1, {
    theme: cell({ key: "theme", schema: z.string(), tracked: true, defaultValue: "light" }),
    counter: cell({ key: "counter", schema: z.number(), tracked: false, defaultValue: 0 }),
    users: collection({
      keyPrefix: "user",
      entities: {
        user: entity({
          brand: "User",
          schema: z.object({
            name: z.string(),
            email: z.string(),
          }),
        }),
      },
      tracked: true,
    }),
  });

  return defineVersionedSchema({ versions: [schemaV1], migrations: [] });
}

describe("React Hooks", () => {
  let testStorage: ReturnType<typeof createStorage<ReturnType<typeof createTestSchema>>>;

  beforeEach(async () => {
    resetMockBrowserStorage(browserState);
    clearAtomCache();

    const schema = createTestSchema();
    testStorage = createStorage({ schema });
    await testStorage.initialize();
    setGlobalStorage(testStorage);
  });

  describe("getGlobalStorage", () => {
    it("should return the global storage instance", () => {
      const storage = getGlobalStorage();
      expect(storage).toBeDefined();
      expect(storage.schema).toBeDefined();
    });
  });

  describe("useStorageValue", () => {
    it("should return cell value with default", () => {
      const { result } = renderHook(() => useStorageValue(testStorage.schema.theme));

      const [value, meta] = result.current;
      expect(value).toBe("light");
      expect(meta.isLoading).toBe(false);
      expect(meta.usingDefault).toBe(true);
    });

    it("should return cell value after set", async () => {
      await act(async () => {
        await testStorage.set(testStorage.schema.theme, "dark");
      });

      const { result } = renderHook(() => useStorageValue(testStorage.schema.theme));

      const [value, meta] = result.current;
      expect(value).toBe("dark");
      expect(meta.usingDefault).toBe(false);
    });

    it("should update when storage value changes", async () => {
      const { result } = renderHook(() => useStorageValue(testStorage.schema.theme));

      expect(result.current[0]).toBe("light");

      await act(async () => {
        await testStorage.set(testStorage.schema.theme, "dark");
      });

      await waitFor(() => {
        expect(result.current[0]).toBe("dark");
      });
    });

    it("should work with collection byId query", async () => {
      await act(async () => {
        await testStorage.set(testStorage.schema.users.user.byId("user1"), { name: "John", email: "john@example.com" });
      });

      const { result } = renderHook(() => useStorageValue(testStorage.schema.users.user.byId("user1")));

      const [value] = result.current;
      expect(value).toEqual({ name: "John", email: "john@example.com" });
    });

    it("should work with collection all query", async () => {
      await act(async () => {
        await testStorage.set(testStorage.schema.users.user.byId("user1"), { name: "John", email: "john@example.com" });
        await testStorage.set(testStorage.schema.users.user.byId("user2"), { name: "Jane", email: "jane@example.com" });
      });

      const { result } = renderHook(() => useStorageValue(testStorage.schema.users.user.all()));

      const [value] = result.current;
      expect(Object.keys(value || {})).toHaveLength(2);
      expect(value?.user1).toEqual({ name: "John", email: "john@example.com" });
      expect(value?.user2).toEqual({ name: "Jane", email: "jane@example.com" });
    });

    it("should return undefined for non-existent collection item", () => {
      const { result } = renderHook(() => useStorageValue(testStorage.schema.users.user.byId("nonexistent")));

      const [value] = result.current;
      expect(value).toBeUndefined();
    });

    it("should update collection all when items change", async () => {
      await act(async () => {
        await testStorage.set(testStorage.schema.users.user.byId("user1"), { name: "John", email: "john@example.com" });
      });

      const { result } = renderHook(() => useStorageValue(testStorage.schema.users.user.all()));

      expect(Object.keys(result.current[0] || {})).toHaveLength(1);

      await act(async () => {
        await testStorage.set(testStorage.schema.users.user.byId("user2"), { name: "Jane", email: "jane@example.com" });
      });

      await waitFor(() => {
        expect(Object.keys(result.current[0] || {})).toHaveLength(2);
      });
    });
  });
});
