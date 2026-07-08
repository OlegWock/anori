import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createMockBrowserStorage, type MockBrowserStorageState, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import { OUTBOX_KEY } from "../keys";
import { cell, collection, defineSchemaVersion, defineVersionedSchema, entity } from "../schema";
import { createStorage } from "../storage";
import { TOMBSTONE_RETENTION_MS } from "../storage-sync";
import type { Outbox } from "../storage-types";
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
    theme: cell({ key: "theme", schema: z.string(), defaultValue: "Forest", sync: "profile", includedInBackup: true }),
    userNote: cell({ key: "userNote", schema: z.string(), defaultValue: "", sync: "user", includedInBackup: true }),
    counter: cell({ key: "counter", schema: z.number(), sync: "off", includedInBackup: true }),
    stash: collection({
      keyPrefix: "StashEntry",
      entities: {
        entry: entity({ brand: "StashEntry", schema: z.object({ url: z.string() }) }),
      },
      sync: "user",
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

describe("Sync scopes", () => {
  beforeEach(() => {
    resetMockBrowserStorage(browserState);
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("per-scope outbox recording", () => {
    it("records only writes of enabled scopes", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("profile");

      await storage.set(storage.schema.theme, "Ocean");
      await storage.set(storage.schema.userNote, "hello");
      await storage.set(storage.schema.counter, 1);

      expect(storage.sync.getOutbox().map((e) => e.key)).toEqual(["theme"]);
    });

    it("records user-scope writes without the profile scope enabled", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("user");

      await storage.set(storage.schema.theme, "Ocean");
      await storage.set(storage.schema.stash.entry.byId("a"), { url: "https://a" });

      expect(storage.sync.getOutbox().map((e) => e.key)).toEqual(["StashEntry:a"]);
    });

    it("disabling one scope leaves the other recording", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("profile");
      storage.sync.enableOutbox("user");
      storage.sync.disableOutbox("profile");

      await storage.set(storage.schema.theme, "Ocean");
      await storage.set(storage.schema.userNote, "hello");

      expect(storage.sync.getOutbox().map((e) => e.key)).toEqual(["userNote"]);
      expect(storage.sync.isOutboxEnabled("profile")).toBe(false);
      expect(storage.sync.isOutboxEnabled("user")).toBe(true);
    });

    it("gates deletions the same way as writes", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("user");
      await storage.set(storage.schema.userNote, "hello");
      await storage.set(storage.schema.theme, "Ocean");
      await storage.sync.clearOutbox();

      await storage.delete(storage.schema.userNote);
      await storage.delete(storage.schema.theme);

      expect(storage.sync.getOutbox().map((e) => e.key)).toEqual(["userNote"]);
      // The profile deletion is still tombstoned locally, just not queued for push
      expect((browserState.storage.theme as StorageRecord<unknown>).deleted).toBe(true);
    });
  });

  describe("exportOutbox", () => {
    it("groups entries by scope", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("profile");
      storage.sync.enableOutbox("user");

      await storage.set(storage.schema.theme, "Ocean");
      await storage.set(storage.schema.userNote, "hello");
      await storage.set(storage.schema.stash.entry.byId("a"), { url: "https://a" });

      const exported = storage.sync.exportOutbox();
      expect(exported.profile.map((e) => e.key)).toEqual(["theme"]);
      expect(exported.user.map((e) => e.key).sort()).toEqual(["StashEntry:a", "userNote"]);
    });

    it("skips outbox entries whose key is no longer synced", async () => {
      // As if the key was synced when the entry was persisted but is sync: "off" now
      browserState.storage.counter = record(5);
      browserState.storage[OUTBOX_KEY] = [
        { key: "counter", type: "kv", hlc: { pt: NOW, lc: 0, node: "seed" }, addedAt: NOW },
      ] satisfies Outbox;
      const storage = await makeStorage();

      const exported = storage.sync.exportOutbox();
      expect(exported.profile).toHaveLength(0);
      expect(exported.user).toHaveLength(0);
    });
  });

  describe("exportForFullSync", () => {
    it("exports only the requested scope", async () => {
      browserState.storage.theme = record("Ocean");
      browserState.storage.userNote = record("hello");
      browserState.storage["StashEntry:a"] = record({ url: "https://a" }, NOW, "StashEntry");
      browserState.storage.counter = record(5);
      const storage = await makeStorage();

      expect(Object.keys(storage.sync.exportForFullSync("profile").kv)).toEqual(["theme"]);
      expect(Object.keys(storage.sync.exportForFullSync("user").kv).sort()).toEqual(["StashEntry:a", "userNote"]);
    });
  });

  describe("clearOutbox", () => {
    it("clears only the given scope, or everything without one", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("profile");
      storage.sync.enableOutbox("user");
      await storage.set(storage.schema.theme, "Ocean");
      await storage.set(storage.schema.userNote, "hello");

      await storage.sync.clearOutbox("user");
      expect(storage.sync.getOutbox().map((e) => e.key)).toEqual(["theme"]);

      await storage.set(storage.schema.userNote, "again");
      await storage.sync.clearOutbox();
      expect(storage.sync.getOutbox()).toHaveLength(0);
    });
  });

  describe("reconcileAgainstServerKeys scope exemption", () => {
    it("a profile reconcile never removes user-scoped keys", async () => {
      browserState.storage.theme = record("Ocean");
      browserState.storage.userNote = record("hello");
      browserState.storage["StashEntry:a"] = record({ url: "https://a" }, NOW, "StashEntry");
      const storage = await makeStorage();

      // Empty server set — as after switching to a profile that has no cells
      const removed = await storage.sync.reconcileAgainstServerKeys(new Set(), {
        protectOutbox: false,
        scope: "profile",
      });

      expect(removed).toEqual(["theme"]);
      expect(browserState.storage.userNote).toBeDefined();
      expect(browserState.storage["StashEntry:a"]).toBeDefined();
    });

    it("a user reconcile never removes profile-scoped keys", async () => {
      browserState.storage.theme = record("Ocean");
      browserState.storage.userNote = record("hello");
      const storage = await makeStorage();

      const removed = await storage.sync.reconcileAgainstServerKeys(new Set(), {
        protectOutbox: false,
        scope: "user",
      });

      expect(removed).toEqual(["userNote"]);
      expect(browserState.storage.theme).toBeDefined();
    });

    it("defaults to the profile scope", async () => {
      browserState.storage.theme = record("Ocean");
      browserState.storage.userNote = record("hello");
      const storage = await makeStorage();

      const removed = await storage.sync.reconcileAgainstServerKeys(new Set(), { protectOutbox: false });

      expect(removed).toEqual(["theme"]);
      expect(browserState.storage.userNote).toBeDefined();
    });
  });

  describe("enqueueScopeToOutbox", () => {
    it("queues every record of the scope, tombstones included, with existing HLCs", async () => {
      browserState.storage.theme = record("Ocean");
      browserState.storage.userNote = record("hello", NOW - DAY);
      browserState.storage["StashEntry:gone"] = tombstone(NOW - 2 * DAY);
      const storage = await makeStorage();

      await storage.sync.enqueueScopeToOutbox("user");

      const outbox = storage.sync.getOutbox();
      expect(outbox.map((e) => e.key).sort()).toEqual(["StashEntry:gone", "userNote"]);
      expect(outbox.find((e) => e.key === "userNote")?.hlc.pt).toBe(NOW - DAY);
    });

    it("restampHlc rewrites records with fresh timestamps so the push wins LWW everywhere", async () => {
      browserState.storage.theme = record("Ocean", NOW - DAY);
      browserState.storage.userNote = record("hello", NOW - DAY);
      const storage = await makeStorage();

      await storage.sync.enqueueScopeToOutbox("user", { restampHlc: true });

      const restamped = browserState.storage.userNote as StorageRecord<string>;
      expect(restamped.value).toBe("hello");
      expect(restamped.hlc.pt).toBeGreaterThanOrEqual(NOW);
      const entry = storage.sync.getOutbox().find((e) => e.key === "userNote");
      expect(entry?.hlc).toEqual(restamped.hlc);
      // Other scopes are untouched
      expect((browserState.storage.theme as StorageRecord<string>).hlc.pt).toBe(NOW - DAY);
    });

    it("replaces an existing entry for the same key instead of duplicating it", async () => {
      const storage = await makeStorage();
      storage.sync.enableOutbox("user");
      await storage.set(storage.schema.userNote, "hello");

      await storage.sync.enqueueScopeToOutbox("user");

      expect(storage.sync.getOutbox().filter((e) => e.key === "userNote")).toHaveLength(1);
    });
  });

  describe("purgeScopeData", () => {
    it("hard-removes the scope's records (tombstones included) and outbox entries, leaving other scopes", async () => {
      browserState.storage.theme = record("Ocean");
      browserState.storage.userNote = record("hello");
      browserState.storage["StashEntry:gone"] = tombstone(NOW - DAY);
      const storage = await makeStorage();
      storage.sync.enableOutbox("profile");
      storage.sync.enableOutbox("user");
      await storage.set(storage.schema.userNote, "edited");
      await storage.set(storage.schema.theme, "Forest");

      const removed = await storage.sync.purgeScopeData("user");

      expect(removed.sort()).toEqual(["StashEntry:gone", "userNote"]);
      expect(browserState.storage.userNote).toBeUndefined();
      expect(browserState.storage["StashEntry:gone"]).toBeUndefined();
      expect(browserState.storage.theme).toBeDefined();
      expect(storage.sync.getOutbox().map((e) => e.key)).toEqual(["theme"]);
    });
  });

  describe("compactTombstones", () => {
    it("compacts expired tombstones of both synced scopes but not off keys", async () => {
      browserState.storage.theme = tombstone(NOW - TOMBSTONE_RETENTION_MS - DAY);
      browserState.storage.userNote = tombstone(NOW - TOMBSTONE_RETENTION_MS - DAY);
      browserState.storage.counter = tombstone(NOW - TOMBSTONE_RETENTION_MS - DAY);
      const storage = await makeStorage();

      const removed = await storage.sync.compactTombstones();

      expect(removed).toBe(2);
      expect(browserState.storage.theme).toBeUndefined();
      expect(browserState.storage.userNote).toBeUndefined();
      expect(browserState.storage.counter).toBeDefined();
    });
  });
});
