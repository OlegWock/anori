import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type MockBrowserStorageState, createMockBrowserStorage, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import { cell, collection, defineSchemaVersion, defineVersionedSchema, entity } from "../schema";
import { createStorage } from "../storage";

describe("Storage", () => {
  beforeEach(() => {
    resetMockBrowserStorage(browserState);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createTestSchema() {
    const v1 = defineSchemaVersion(1, {
      theme: cell({ key: "theme", schema: z.string(), defaultValue: "Forest", tracked: true }),
      counter: cell({ key: "counter", schema: z.number(), tracked: false }),
      folders: collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({ brand: "FolderDetails", schema: z.object({ name: z.string(), color: z.string() }) }),
        },
        tracked: true,
      }),
      widgets: collection({
        keyPrefix: "Widget",
        entities: {
          notes: entity({ brand: "NotesWidget", schema: z.object({ content: z.string() }) }),
          todos: entity({ brand: "TodoWidget", schema: z.object({ items: z.array(z.string()) }) }),
        },
        tracked: true,
      }),
    });

    return defineVersionedSchema({ versions: [v1], migrations: [] });
  }

  describe("initialization", () => {
    it("should initialize with new HLC state", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });

      await storage.initialize();

      expect(browserState.storage.__hlc_state).toBeDefined();
      const hlcState = browserState.storage.__hlc_state as { nodeId: string; last: unknown };
      expect(hlcState.nodeId).toMatch(/^[0-9a-f]{16}$/);
    });

    it("should restore existing HLC state", async () => {
      browserState.storage.__hlc_state = {
        nodeId: "existing123456789",
        last: { pt: 1000, lc: 5, node: "existing123456789" },
      };

      const schema = createTestSchema();
      const storage = createStorage({ schema });

      await storage.initialize();

      const hlcState = browserState.storage.__hlc_state as { nodeId: string };
      expect(hlcState.nodeId).toBe("existing123456789");
    });

    it("should throw if not initialized", () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });

      expect(() => storage.get(storage.schema.theme)).toThrow("Storage not initialized");
    });
  });

  describe("get", () => {
    it("should return default value for missing cell", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const value = storage.get(storage.schema.theme);

      expect(value).toBe("Forest");
    });

    it("should return undefined for missing cell without default", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const value = storage.get(storage.schema.counter);

      expect(value).toBeUndefined();
    });

    it("should return stored cell value", async () => {
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "test" }, value: "Ocean" };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const value = storage.get(storage.schema.theme);

      expect(value).toBe("Ocean");
    });

    it("should return undefined for deleted cell", async () => {
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "test" }, deleted: true, value: null };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const value = storage.get(storage.schema.theme);

      // Returns default value since cell is deleted
      expect(value).toBe("Forest");
    });

    it("should get collection item by id", async () => {
      browserState.storage["Folder:home"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "FolderDetails",
        value: { name: "Home", color: "blue" },
      };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const value = storage.get(storage.schema.folders.byId("home"));

      expect(value).toEqual({ name: "Home", color: "blue" });
    });

    it("should return undefined for missing collection item", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const value = storage.get(storage.schema.folders.byId("nonexistent"));

      expect(value).toBeUndefined();
    });

    it("should get all collection items", async () => {
      browserState.storage["Folder:home"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "FolderDetails",
        value: { name: "Home", color: "blue" },
      };
      browserState.storage["Folder:work"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "FolderDetails",
        value: { name: "Work", color: "green" },
      };
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "test" }, value: "Ocean" };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const all = storage.get(storage.schema.folders.all());

      expect(all).toEqual({
        home: { name: "Home", color: "blue" },
        work: { name: "Work", color: "green" },
      });
    });

    it("should filter collection items by brand", async () => {
      browserState.storage["Widget:1"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "NotesWidget",
        value: { content: "Note 1" },
      };
      browserState.storage["Widget:2"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "TodoWidget",
        value: { items: ["Task 1"] },
      };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const notes = storage.get(storage.schema.widgets.notes.all());

      expect(notes).toEqual({
        "1": { content: "Note 1" },
      });
    });

    it("should exclude deleted items from collection.all", async () => {
      browserState.storage["Folder:home"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "FolderDetails",
        value: { name: "Home", color: "blue" },
      };
      browserState.storage["Folder:deleted"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "FolderDetails",
        deleted: true,
        value: null,
      };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const all = storage.get(storage.schema.folders.all());

      expect(all).toEqual({
        home: { name: "Home", color: "blue" },
      });
    });
  });

  describe("set", () => {
    it("should set cell value", async () => {
      vi.setSystemTime(5000);

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.set(storage.schema.theme, "Ocean");

      const record = browserState.storage.theme as { value: string; hlc: { pt: number } };
      expect(record.value).toBe("Ocean");
      expect(record.hlc.pt).toBe(5000);
    });

    it("should add tracked cell to outbox", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.set(storage.schema.theme, "Ocean");

      const outbox = browserState.storage.__outbox as Array<{ key: string }>;
      expect(outbox).toContainEqual(expect.objectContaining({ key: "theme" }));
    });

    it("should not add untracked cell to outbox", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.set(storage.schema.counter, 42);

      const outbox = (browserState.storage.__outbox as Array<{ key: string }>) || [];
      expect(outbox.find((e) => e.key === "counter")).toBeUndefined();
    });

    it("should set collection item", async () => {
      vi.setSystemTime(5000);

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.set(storage.schema.folders.byId("home"), { name: "Home", color: "blue" });

      const record = browserState.storage["Folder:home"] as { value: { name: string }; brand: string };
      expect(record.value).toEqual({ name: "Home", color: "blue" });
      expect(record.brand).toBeUndefined(); // No brand for generic byId
    });

    it("should set collection item with brand through entity accessor", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.set(storage.schema.widgets.notes.byId("1"), { content: "Hello" });

      const record = browserState.storage["Widget:1"] as { value: { content: string }; brand: string };
      expect(record.value).toEqual({ content: "Hello" });
      expect(record.brand).toBe("NotesWidget");
    });

    it("should dedupe outbox entries", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.set(storage.schema.theme, "Ocean");
      await storage.set(storage.schema.theme, "Forest");
      await storage.set(storage.schema.theme, "Lake");

      const outbox = browserState.storage.__outbox as Array<{ key: string }>;
      const themeEntries = outbox.filter((e) => e.key === "theme");
      expect(themeEntries).toHaveLength(1);
    });
  });

  describe("delete", () => {
    it("should soft delete cell", async () => {
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "test" }, value: "Ocean" };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.delete(storage.schema.theme);

      const record = browserState.storage.theme as { deleted: boolean; value: null };
      expect(record.deleted).toBe(true);
      expect(record.value).toBeNull();
    });

    it("should soft delete collection item", async () => {
      browserState.storage["Folder:home"] = {
        hlc: { pt: 1000, lc: 0, node: "test" },
        brand: "FolderDetails",
        value: { name: "Home", color: "blue" },
      };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.delete(storage.schema.folders.byId("home"));

      const record = browserState.storage["Folder:home"] as { deleted: boolean; brand: string };
      expect(record.deleted).toBe(true);
      expect(record.brand).toBe("FolderDetails"); // Brand preserved
    });

    it("should add deleted item to outbox", async () => {
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "test" }, value: "Ocean" };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.delete(storage.schema.theme);

      const outbox = browserState.storage.__outbox as Array<{ key: string }>;
      expect(outbox).toContainEqual(expect.objectContaining({ key: "theme" }));
    });
  });

  describe("sync", () => {
    it("should get outbox", async () => {
      browserState.storage.__outbox = [
        { key: "theme", type: "kv", hlc: { pt: 1000, lc: 0, node: "test" }, addedAt: 1000 },
      ];

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const outbox = storage.sync.getOutbox();

      expect(outbox).toHaveLength(1);
      expect(outbox[0].key).toBe("theme");
    });

    it("should remove from outbox", async () => {
      browserState.storage.__outbox = [
        { key: "theme", type: "kv", hlc: { pt: 1000, lc: 0, node: "test" }, addedAt: 1000 },
        { key: "counter", type: "kv", hlc: { pt: 1000, lc: 0, node: "test" }, addedAt: 1000 },
      ];

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.sync.removeFromOutbox([{ key: "theme", hlc: { pt: 1000, lc: 0, node: "test" } }]);

      const outbox = browserState.storage.__outbox as Array<{ key: string }>;
      expect(outbox).toHaveLength(1);
      expect(outbox[0].key).toBe("counter");
    });

    it("should remove from outbox by key+hlc match", async () => {
      browserState.storage.__outbox = [
        { key: "theme", type: "kv", hlc: { pt: 1000, lc: 0, node: "test" }, addedAt: 1000 },
        { key: "counter", type: "kv", hlc: { pt: 1000, lc: 0, node: "test" }, addedAt: 1000 },
        { key: "theme", type: "kv", hlc: { pt: 2000, lc: 0, node: "test" }, addedAt: 2000 },
      ];

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      await storage.sync.removeFromOutbox([
        { key: "theme", hlc: { pt: 1000, lc: 0, node: "test" } },
        { key: "counter", hlc: { pt: 1000, lc: 0, node: "test" } },
      ]);

      const outbox = browserState.storage.__outbox as Array<{ key: string; hlc: { pt: number } }>;
      expect(outbox).toHaveLength(1);
      expect(outbox[0].key).toBe("theme");
      expect(outbox[0].hlc.pt).toBe(2000);
    });

    it("should export for full sync", async () => {
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "test" }, value: "Ocean" };
      browserState.storage["Folder:home"] = { hlc: { pt: 1000, lc: 0, node: "test" }, value: { name: "Home" } };
      browserState.storage.__hlc_state = { nodeId: "test", last: { pt: 1000, lc: 0, node: "test" } };
      browserState.storage.__outbox = [];

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const exported = storage.sync.exportForFullSync();

      expect(exported.kv.theme).toBeDefined();
      expect(exported.kv["Folder:home"]).toBeDefined();
      expect(exported.kv.__hlc_state).toBeUndefined();
      expect(exported.kv.__outbox).toBeUndefined();
      expect(exported.files).toBeDefined();
    });

    it("should merge remote changes - apply newer", async () => {
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "local" }, value: "Local" };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const result = await storage.sync.mergeRemoteChanges([
        {
          key: "theme",
          record: { hlc: { pt: 2000, lc: 0, node: "remote" }, value: "Remote" },
          schemaVersion: 1,
        },
      ]);

      expect(result.applied).toContain("theme");
      const record = browserState.storage.theme as { value: string };
      expect(record.value).toBe("Remote");
    });

    it("should merge remote changes - skip older", async () => {
      browserState.storage.theme = { hlc: { pt: 2000, lc: 0, node: "local" }, value: "Local" };

      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const result = await storage.sync.mergeRemoteChanges([
        {
          key: "theme",
          record: { hlc: { pt: 1000, lc: 0, node: "remote" }, value: "Remote" },
          schemaVersion: 1,
        },
      ]);

      expect(result.skipped).toContain("theme");
      const record = browserState.storage.theme as { value: string };
      expect(record.value).toBe("Local");
    });

    it("should skip remote changes with different schema version", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const result = await storage.sync.mergeRemoteChanges([
        {
          key: "theme",
          record: { hlc: { pt: 2000, lc: 0, node: "remote" }, value: "Remote" },
          schemaVersion: 2, // Different from current version 1
        },
      ]);

      expect(result.skipped).toContain("theme");
    });
  });

  describe("fork", () => {
    it("should create a fork with unique id", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const fork1 = storage.fork();
      const fork2 = storage.fork();

      expect(fork1.id).toBeDefined();
      expect(fork2.id).toBeDefined();
      expect(fork1.id).not.toBe(fork2.id);
    });

    it("fork subscription should not receive its own writes", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const fork = storage.fork();
      const callback = vi.fn();

      fork.subscribe(schema.latestSchema.definition.theme, callback);

      // Write through the fork
      await fork.set(schema.latestSchema.definition.theme, "dark");

      // Callback should NOT be called for own write
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it("fork subscription should receive writes from other forks", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const fork1 = storage.fork();
      const fork2 = storage.fork();
      const callback = vi.fn();

      fork1.subscribe(schema.latestSchema.definition.theme, callback);

      // Write through fork2
      await fork2.set(schema.latestSchema.definition.theme, "dark");

      // Fork1's callback should be called
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("dark", undefined);
    });

    it("fork subscription should receive writes from main storage", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const fork = storage.fork();
      const callback = vi.fn();

      fork.subscribe(schema.latestSchema.definition.theme, callback);

      // Write through main storage (no source ID)
      await storage.set(schema.latestSchema.definition.theme, "dark");

      // Fork's callback should be called
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("dark", undefined);
    });

    it("main storage subscription should receive writes from forks", async () => {
      const schema = createTestSchema();
      const storage = createStorage({ schema });
      await storage.initialize();

      const fork = storage.fork();
      const callback = vi.fn();

      storage.subscribe(schema.latestSchema.definition.theme, callback);

      // Write through fork
      await fork.set(schema.latestSchema.definition.theme, "dark");

      // Main storage callback should be called
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("dark", undefined);
    });
  });
});
