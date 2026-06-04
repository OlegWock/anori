import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type MockBrowserStorageState, createMockBrowserStorage, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import { cell, collection, defineSchemaVersion, defineVersionedSchema, entity } from "../schema";
import { createStorage } from "../storage";
import { TOMBSTONE_RETENTION_MS } from "../storage-sync";
import type { StorageRecord } from "../types";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function tombstone(pt: number): StorageRecord<null> {
  return { hlc: { pt, lc: 0, node: "seed" }, deleted: true, value: null };
}

function record<T>(value: T, pt = NOW, brand?: string): StorageRecord<T> {
  return { hlc: { pt, lc: 0, node: "seed" }, value, ...(brand ? { brand } : {}) };
}

function createTestSchema() {
  const v1 = defineSchemaVersion(1, {
    theme: cell({ key: "theme", schema: z.string(), defaultValue: "Forest", tracked: true, includedInBackup: true }),
    counter: cell({ key: "counter", schema: z.number(), tracked: false, includedInBackup: true }),
    folders: collection({
      keyPrefix: "Folder",
      entities: {
        folder: entity({ brand: "FolderDetails", schema: z.object({ name: z.string() }) }),
      },
      tracked: true,
      includedInBackup: true,
    }),
  });

  return defineVersionedSchema({ versions: [v1], migrations: [] });
}

async function makeStorage() {
  const storage = createStorage({ schema: createTestSchema() });
  await storage.initialize();
  return storage;
}

describe("Storage GC", () => {
  beforeEach(() => {
    resetMockBrowserStorage(browserState);
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("deleteInternal no-op on absent", () => {
    it("writes nothing when deleting a key that was never set", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox();

      await storage.delete(storage.schema.folders.folder.byId("ghost"));

      expect(browserState.storage["Folder:ghost"]).toBeUndefined();
      expect(storage.sync.getOutbox()).toHaveLength(0);
    });

    it("does not re-tombstone or re-enqueue an already-deleted key", async () => {
      browserState.storage["Folder:t"] = tombstone(NOW - DAY);
      const storage = await makeStorage();
      storage.sync.enableOutbox();

      await storage.delete(storage.schema.folders.folder.byId("t"));

      // Unchanged tombstone, nothing queued for sync.
      expect(browserState.storage["Folder:t"]).toEqual(tombstone(NOW - DAY));
      expect(storage.sync.getOutbox()).toHaveLength(0);
    });

    it("hard-deletes untracked cells outright, without a tombstone", async () => {
      browserState.storage.counter = record(5);
      const storage = await makeStorage();
      storage.sync.enableOutbox();

      await storage.delete(storage.schema.counter);

      // Removed entirely (not a {deleted:true} tombstone), nothing queued for sync.
      expect(browserState.storage.counter).toBeUndefined();
      expect(storage.sync.getOutbox()).toHaveLength(0);
    });

    it("still tombstones and enqueues a live key", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox();
      await storage.set(storage.schema.folders.folder.byId("a"), { name: "A" });

      await storage.delete(storage.schema.folders.folder.byId("a"));

      const stored = browserState.storage["Folder:a"] as StorageRecord<unknown>;
      expect(stored.deleted).toBe(true);
      expect(storage.sync.getOutbox().map((e) => e.key)).toContain("Folder:a");
    });
  });

  describe("compactTombstones", () => {
    it("removes tracked tombstones older than the retention horizon and keeps the rest", async () => {
      browserState.storage["Folder:old"] = tombstone(NOW - TOMBSTONE_RETENTION_MS - DAY);
      browserState.storage["Folder:recent"] = tombstone(NOW - DAY);
      browserState.storage["Folder:live"] = record({ name: "Live" }, NOW, "FolderDetails");
      // Untracked tombstone (counter is tracked: false) — must be left alone.
      browserState.storage.counter = tombstone(NOW - TOMBSTONE_RETENTION_MS - DAY);

      const storage = await makeStorage();
      const removed = await storage.sync.compactTombstones();

      expect(removed).toBe(1);
      expect(browserState.storage["Folder:old"]).toBeUndefined();
      expect(browserState.storage["Folder:recent"]).toBeDefined();
      expect(browserState.storage["Folder:live"]).toBeDefined();
      expect(browserState.storage.counter).toBeDefined();
    });

    it("never touches internal keys", async () => {
      const storage = await makeStorage();
      await storage.sync.compactTombstones();

      expect(browserState.storage.__hlc_state).toBeDefined();
    });
  });

  describe("reconcileAgainstServerKeys", () => {
    it("removes live tracked keys absent from the server set, keeps present ones", async () => {
      browserState.storage["Folder:a"] = record({ name: "A" }, NOW, "FolderDetails");
      browserState.storage["Folder:b"] = record({ name: "B" }, NOW, "FolderDetails");
      const storage = await makeStorage();

      const removed = await storage.sync.reconcileAgainstServerKeys(new Set(["Folder:a"]));

      expect(removed).toEqual(["Folder:b"]);
      expect(browserState.storage["Folder:a"]).toBeDefined();
      expect(browserState.storage["Folder:b"]).toBeUndefined();
    });

    it("protects keys with pending outbox changes by default", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox();
      await storage.set(storage.schema.folders.folder.byId("c"), { name: "C" });

      const removed = await storage.sync.reconcileAgainstServerKeys(new Set());

      expect(removed).toHaveLength(0);
      expect(browserState.storage["Folder:c"]).toBeDefined();
    });

    it("discards local-only data when protectOutbox is false (explicit pull replace)", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox();
      await storage.set(storage.schema.folders.folder.byId("c"), { name: "C" });

      const removed = await storage.sync.reconcileAgainstServerKeys(new Set(), { protectOutbox: false });

      expect(removed).toEqual(["Folder:c"]);
      expect(browserState.storage["Folder:c"]).toBeUndefined();
    });

    it("removes cells missing on remote without tombstone and outbox entry", async () => {
      // A synced live key not in the outbox (seeded directly, as if pushed long ago).
      browserState.storage["Folder:a"] = record({ name: "A" }, NOW, "FolderDetails");
      const storage = await makeStorage();
      storage.sync.enableOutbox();

      await storage.sync.reconcileAgainstServerKeys(new Set());

      expect(browserState.storage["Folder:a"]).toBeUndefined(); // gone outright, not a tombstone
      expect(storage.sync.getOutbox()).toHaveLength(0); // nothing to re-push
    });

    it("leaves internal and untracked keys alone", async () => {
      browserState.storage.counter = record(5); // untracked
      browserState.storage["Folder:x"] = record({ name: "X" }, NOW, "FolderDetails");
      const storage = await makeStorage();

      const removed = await storage.sync.reconcileAgainstServerKeys(new Set(), { protectOutbox: false });

      expect(removed).toEqual(["Folder:x"]);
      expect(browserState.storage.counter).toBeDefined();
      expect(browserState.storage.__hlc_state).toBeDefined();
    });
  });
});
