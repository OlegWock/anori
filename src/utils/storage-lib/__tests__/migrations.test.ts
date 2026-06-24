import { z } from "zod";
import { createMockBrowserStorage, type MockBrowserStorageState, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import {
  getStoredSchemaVersion,
  migrateSnapshot,
  needsMigration,
  runMigrations,
  setStoredSchemaVersion,
} from "../migrations/runner";
import { cell, collection, createMigration, defineSchemaVersion, defineVersionedSchema, entity } from "../schema";

describe("Migration System", () => {
  beforeEach(() => {
    resetMockBrowserStorage(browserState);
  });

  describe("getStoredSchemaVersion / setStoredSchemaVersion", () => {
    it("should return 0 when no version is stored", async () => {
      const version = await getStoredSchemaVersion();
      expect(version).toBe(0);
    });

    it("should store and retrieve schema version", async () => {
      await setStoredSchemaVersion(5);
      const version = await getStoredSchemaVersion();
      expect(version).toBe(5);
    });
  });

  describe("needsMigration", () => {
    it("should return false for fresh install (version 0)", async () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({ versions: [v1], migrations: [] });

      const needs = await needsMigration(schema);
      expect(needs).toBe(false);
    });

    it("should return false when version matches", async () => {
      await setStoredSchemaVersion(1);

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({ versions: [v1], migrations: [] });

      const needs = await needsMigration(schema);
      expect(needs).toBe(false);
    });

    it("should return true when version is behind", async () => {
      await setStoredSchemaVersion(1);

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
        newField: cell({ key: "newField", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [createMigration(v1, v2, async () => {})],
      });

      const needs = await needsMigration(schema);
      expect(needs).toBe(true);
    });
  });

  describe("runMigrations", () => {
    it("should set version on fresh install without running migrations", async () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({ versions: [v1], migrations: [] });

      const result = await runMigrations(schema);

      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(0);
      expect(result.toVersion).toBe(1);
      expect(result.migrationsRun).toBe(0);
      expect(await getStoredSchemaVersion()).toBe(1);
    });

    it("should not run migrations when already at latest version", async () => {
      await setStoredSchemaVersion(2);

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const migrationFn = vi.fn();
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [createMigration(v1, v2, migrationFn)],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(true);
      expect(result.migrationsRun).toBe(0);
      expect(migrationFn).toHaveBeenCalledTimes(0);
    });

    it("should run single migration", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.theme = {
        hlc: { pt: 1000, lc: 0, node: "abc123" },
        value: "dark",
      };

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        themeMode: cell({
          key: "themeMode",
          schema: z.string(),
          defaultValue: "light",
          tracked: true,
          includedInBackup: true,
        }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const oldTheme = ctx.from.get(ctx.from.schema.theme);
            ctx.to.set(ctx.to.schema.themeMode, oldTheme ?? "light");
            ctx.to.delete(ctx.from.schema.theme);
          }),
        ],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(result.migrationsRun).toBe(1);
      expect(await getStoredSchemaVersion()).toBe(2);

      expect(browserState.storage.themeMode).toBeDefined();
      expect((browserState.storage.themeMode as { value: string }).value).toBe("dark");

      const themeTombstone = browserState.storage.theme as { deleted: boolean; value: null };
      expect(themeTombstone.deleted).toBe(true);
      expect(themeTombstone.value).toBeNull();
    });

    it("should carry forward keys the migration doesn't touch", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.kept = {
        hlc: { pt: 1000, lc: 0, node: "abc123" },
        value: "untouched",
      };

      const v1 = defineSchemaVersion(1, {
        kept: cell({ key: "kept", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        kept: cell({ key: "kept", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
        added: cell({ key: "added", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            ctx.to.set(ctx.to.schema.added, "new");
          }),
        ],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(true);
      // The untouched key is preserved as-is (not tombstoned or removed).
      const kept = browserState.storage.kept as { value: string; deleted?: boolean };
      expect(kept.value).toBe("untouched");
      expect(kept.deleted).toBeUndefined();
      expect((browserState.storage.added as { value: string }).value).toBe("new");
    });

    it("should tombstone tracked deletions but remove untracked ones", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.trackedKey = { hlc: { pt: 1000, lc: 0, node: "abc123" }, value: "t" };
      browserState.storage.localKey = { hlc: { pt: 1001, lc: 0, node: "abc123" }, value: "l" };

      const v1 = defineSchemaVersion(1, {
        trackedKey: cell({
          key: "trackedKey",
          schema: z.string(),
          defaultValue: "",
          tracked: true,
          includedInBackup: true,
        }),
        localKey: cell({
          key: "localKey",
          schema: z.string(),
          defaultValue: "",
          tracked: false,
          includedInBackup: true,
        }),
      });
      const v2 = defineSchemaVersion(2, {
        kept: cell({ key: "kept", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            ctx.to.delete(ctx.from.schema.trackedKey);
            ctx.to.delete(ctx.from.schema.localKey);
          }),
        ],
      });

      const result = await runMigrations(schema);
      expect(result.success).toBe(true);

      // Tracked deletion → tombstone (so it syncs to peers).
      const tracked = browserState.storage.trackedKey as { deleted?: boolean; value: null };
      expect(tracked.deleted).toBe(true);
      expect(tracked.value).toBeNull();
      // Untracked deletion → actually removed from local storage.
      expect(browserState.storage.localKey).toBeUndefined();
    });

    it("should run multiple migrations in sequence", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.counter = {
        hlc: { pt: 1000, lc: 0, node: "abc123" },
        value: 5,
      };

      const v1 = defineSchemaVersion(1, {
        counter: cell({ key: "counter", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        counter: cell({ key: "counter", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
        doubled: cell({ key: "doubled", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const v3 = defineSchemaVersion(3, {
        counter: cell({ key: "counter", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
        doubled: cell({ key: "doubled", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
        tripled: cell({ key: "tripled", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2, v3],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const counter = ctx.from.get(ctx.from.schema.counter) ?? 0;
            ctx.to.set(ctx.to.schema.counter, counter);
            ctx.to.set(ctx.to.schema.doubled, counter * 2);
          }),
          createMigration(v2, v3, async (ctx) => {
            const counter = ctx.from.get(ctx.from.schema.counter) ?? 0;
            const doubled = ctx.from.get(ctx.from.schema.doubled) ?? 0;
            ctx.to.set(ctx.to.schema.counter, counter);
            ctx.to.set(ctx.to.schema.doubled, doubled);
            ctx.to.set(ctx.to.schema.tripled, counter * 3);
          }),
        ],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(true);
      expect(result.migrationsRun).toBe(2);
      expect(await getStoredSchemaVersion()).toBe(3);

      expect((browserState.storage.counter as { value: number }).value).toBe(5);
      expect((browserState.storage.doubled as { value: number }).value).toBe(10);
      expect((browserState.storage.tripled as { value: number }).value).toBe(15);
    });

    it("should migrate collection data", async () => {
      await setStoredSchemaVersion(1);

      browserState.storage["Item:item1"] = {
        hlc: { pt: 1000, lc: 0, node: "abc123" },
        value: { name: "First" },
        brand: "Item",
      };
      browserState.storage["Item:item2"] = {
        hlc: { pt: 1001, lc: 0, node: "abc123" },
        value: { name: "Second" },
        brand: "Item",
      };

      const itemEntity = entity({
        brand: "Item",
        schema: z.object({ name: z.string() }),
      });
      const newItemEntity = entity({
        brand: "NewItem",
        schema: z.object({ title: z.string(), migrated: z.boolean() }),
      });

      const v1 = defineSchemaVersion(1, {
        items: collection({ keyPrefix: "Item", entities: { item: itemEntity }, tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        items: collection({
          keyPrefix: "Item",
          entities: { item: newItemEntity },
          tracked: true,
          includedInBackup: true,
        }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const allItems = ctx.from.get(ctx.from.schema.items.item.all());
            for (const [id, item] of Object.entries(allItems)) {
              ctx.to.set(ctx.to.schema.items.item.byId(id), {
                title: item.name,
                migrated: true,
              });
            }
          }),
        ],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(true);

      const item1 = browserState.storage["Item:item1"] as { value: { title: string; migrated: boolean } };
      expect(item1.value.title).toBe("First");
      expect(item1.value.migrated).toBe(true);

      const item2 = browserState.storage["Item:item2"] as { value: { title: string; migrated: boolean } };
      expect(item2.value.title).toBe("Second");
      expect(item2.value.migrated).toBe(true);
    });

    it("should handle migration errors gracefully", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.theme = {
        hlc: { pt: 1000, lc: 0, node: "abc123" },
        value: "dark",
      };

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true, includedInBackup: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async () => {
            throw new Error("Migration failed!");
          }),
        ],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Migration failed!");
      expect(result.migrationsRun).toBe(0);
      expect(await getStoredSchemaVersion()).toBe(1);
    });

    it("should preserve the source hlc for a same-key re-encoding", async () => {
      await setStoredSchemaVersion(1);
      const sourceHlc = { pt: 1000, lc: 3, node: "abc123" };
      browserState.storage.theme = { hlc: sourceHlc, value: { hsl: 1 } };

      const v1 = defineSchemaVersion(1, {
        theme: cell({
          key: "theme",
          schema: z.object({ hsl: z.number() }),
          defaultValue: { hsl: 0 },
          tracked: true,
          includedInBackup: true,
        }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({
          key: "theme",
          schema: z.object({ oklch: z.number() }),
          defaultValue: { oklch: 0 },
          tracked: true,
          includedInBackup: true,
        }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const old = ctx.from.get(ctx.from.schema.theme);
            ctx.to.set(ctx.to.schema.theme, { oklch: old?.hsl ?? 0 });
          }),
        ],
      });

      await runMigrations(schema);

      const theme = browserState.storage.theme as { hlc: typeof sourceHlc; value: { oklch: number } };
      expect(theme.value).toEqual({ oklch: 1 });
      expect(theme.hlc).toEqual(sourceHlc);
    });

    it("should tick a fresh hlc for a brand-new key", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.theme = { hlc: { pt: 1000, lc: 0, node: "abc123" }, value: "dark" };

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
        added: cell({ key: "added", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [createMigration(v1, v2, async (ctx) => ctx.to.set(ctx.to.schema.added, "new"))],
      });

      await runMigrations(schema);

      const added = browserState.storage.added as { hlc: { pt: number; node: string } };
      // A new key gets a real, current hlc (not the source's pt:1000, not node abc123).
      expect(added.hlc.pt).toBeGreaterThan(1000);
      expect(added.hlc.node).not.toBe("abc123");
    });

    it("should tick when { tick: true } is passed for an existing key", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.token = { hlc: { pt: 1000, lc: 0, node: "abc123" }, value: "old" };

      const v1 = defineSchemaVersion(1, {
        token: cell({ key: "token", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        token: cell({ key: "token", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => ctx.to.set(ctx.to.schema.token, "rotated", { tick: true })),
        ],
      });

      await runMigrations(schema);

      const token = browserState.storage.token as { hlc: { pt: number; node: string } };
      expect(token.hlc.pt).toBeGreaterThan(1000);
      expect(token.hlc.node).not.toBe("abc123");
    });

    it("should carry a renamed key's source hlc via getRecord + explicit hlc", async () => {
      await setStoredSchemaVersion(1);
      const sourceHlc = { pt: 2000, lc: 1, node: "src" };
      browserState.storage.oldName = { hlc: sourceHlc, value: "v" };

      const v1 = defineSchemaVersion(1, {
        oldName: cell({ key: "oldName", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        newName: cell({ key: "newName", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const rec = ctx.from.getRecord(ctx.from.schema.oldName);
            ctx.to.set(ctx.to.schema.newName, rec?.value ?? "", { hlc: rec?.hlc });
            ctx.to.delete(ctx.from.schema.oldName);
          }),
        ],
      });

      await runMigrations(schema);

      const newName = browserState.storage.newName as { hlc: typeof sourceHlc; value: string };
      expect(newName.value).toBe("v");
      expect(newName.hlc).toEqual(sourceHlc);
    });

    it("should stop on first failing migration in sequence", async () => {
      await setStoredSchemaVersion(1);

      const v1 = defineSchemaVersion(1, {
        a: cell({ key: "a", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        a: cell({ key: "a", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
        b: cell({ key: "b", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const v3 = defineSchemaVersion(3, {
        a: cell({ key: "a", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
        b: cell({ key: "b", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
        c: cell({ key: "c", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });

      const migration2to3 = vi.fn();

      const schema = defineVersionedSchema({
        versions: [v1, v2, v3],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            ctx.to.set(ctx.to.schema.a, 1);
            ctx.to.set(ctx.to.schema.b, 2);
          }),
          createMigration(v2, v3, async () => {
            migration2to3();
            throw new Error("Second migration failed");
          }),
        ],
      });

      const result = await runMigrations(schema);

      expect(result.success).toBe(false);
      expect(result.migrationsRun).toBe(1);
      expect(await getStoredSchemaVersion()).toBe(2);
      expect(migration2to3).toHaveBeenCalled();
    });
  });

  describe("migrateSnapshot (pure)", () => {
    let tickCounter = 0;
    const hlcTick = () => ({ pt: 9000 + ++tickCounter, lc: 0, node: "migrator" });

    beforeEach(() => {
      tickCounter = 0;
    });

    const themeV1 = (def: { hsl: number }, hlc = { pt: 1000, lc: 2, node: "src" }) => ({ hlc, value: def }) as const;

    function buildSchema() {
      const v1 = defineSchemaVersion(1, {
        theme: cell({
          key: "theme",
          schema: z.object({ hsl: z.number() }),
          defaultValue: { hsl: 0 },
          tracked: true,
          includedInBackup: true,
        }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({
          key: "theme",
          schema: z.object({ oklch: z.number() }),
          defaultValue: { oklch: 0 },
          tracked: true,
          includedInBackup: true,
        }),
        scheme: cell({
          key: "scheme",
          schema: z.string(),
          defaultValue: "dark",
          tracked: true,
          includedInBackup: true,
        }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const old = ctx.from.get(ctx.from.schema.theme);
            ctx.to.set(ctx.to.schema.theme, { oklch: old?.hsl ?? 0 });
            ctx.to.set(ctx.to.schema.scheme, "dark");
          }),
        ],
      });
      return schema;
    }

    it("returns the diff with preserved + ticked hlcs, without touching storage", async () => {
      const sourceHlc = { pt: 1000, lc: 2, node: "src" };
      const snapshot = { theme: themeV1({ hsl: 7 }, sourceHlc) };

      const { diff } = await migrateSnapshot(buildSchema(), 1, 2, snapshot, hlcTick);

      // re-encoded same-key cell keeps the source hlc
      expect(diff.theme.value).toEqual({ oklch: 7 });
      expect(diff.theme.hlc).toEqual(sourceHlc);
      // new cell gets a ticked hlc
      expect(diff.scheme.value).toBe("dark");
      expect(diff.scheme.hlc.node).toBe("migrator");
      // pure: storage untouched, input snapshot not mutated
      expect(Object.keys(browserState.storage)).toHaveLength(0);
      expect(snapshot.theme.value).toEqual({ hsl: 7 });
    });

    it("accumulates the net diff across a chain, later step winning", async () => {
      const v1 = defineSchemaVersion(1, {
        n: cell({ key: "n", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        n: cell({ key: "n", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const v3 = defineSchemaVersion(3, {
        n: cell({ key: "n", schema: z.number(), defaultValue: 0, tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2, v3],
        migrations: [
          createMigration(v1, v2, async (ctx) =>
            ctx.to.set(ctx.to.schema.n, (ctx.from.get(ctx.from.schema.n) ?? 0) + 1),
          ),
          createMigration(v2, v3, async (ctx) =>
            ctx.to.set(ctx.to.schema.n, (ctx.from.get(ctx.from.schema.n) ?? 0) * 10),
          ),
        ],
      });

      const { diff } = await migrateSnapshot(
        schema,
        1,
        3,
        { n: { hlc: { pt: 1, lc: 0, node: "s" }, value: 5 } },
        hlcTick,
      );
      // (5 + 1) * 10 = 60
      expect(diff.n.value).toBe(60);
    });

    it("includes tombstones for deleted keys in the diff", async () => {
      const v1 = defineSchemaVersion(1, {
        old: cell({ key: "old", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const v2 = defineSchemaVersion(2, {
        kept: cell({ key: "kept", schema: z.string(), defaultValue: "", tracked: true, includedInBackup: true }),
      });
      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [createMigration(v1, v2, async (ctx) => ctx.to.delete(ctx.from.schema.old))],
      });

      const { diff } = await migrateSnapshot(
        schema,
        1,
        2,
        { old: { hlc: { pt: 1, lc: 0, node: "s" }, value: "x" } },
        hlcTick,
      );
      expect(diff.old.deleted).toBe(true);
      expect(diff.old.value).toBeNull();
    });
  });
});
