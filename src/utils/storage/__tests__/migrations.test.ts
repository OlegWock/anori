import { z } from "zod";
import { type MockBrowserStorageState, createMockBrowserStorage, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import { getStoredSchemaVersion, needsMigration, runMigrations, setStoredSchemaVersion } from "../migrations/runner";
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
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
      });
      const schema = defineVersionedSchema({ versions: [v1], migrations: [] });

      const needs = await needsMigration(schema);
      expect(needs).toBe(false);
    });

    it("should return false when version matches", async () => {
      await setStoredSchemaVersion(1);

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
      });
      const schema = defineVersionedSchema({ versions: [v1], migrations: [] });

      const needs = await needsMigration(schema);
      expect(needs).toBe(false);
    });

    it("should return true when version is behind", async () => {
      await setStoredSchemaVersion(1);

      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
        newField: cell({ key: "newField", schema: z.number(), defaultValue: 0, tracked: true }),
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
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
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
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
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
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        themeMode: cell({ key: "themeMode", schema: z.string(), defaultValue: "light", tracked: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [
          createMigration(v1, v2, async (ctx) => {
            const oldTheme = ctx.from.get(ctx.from.schema.theme);
            ctx.to.set(ctx.to.schema.themeMode, oldTheme ?? "light");
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

      // Old tracked key should have tombstone, not be deleted
      const themeTombstone = browserState.storage.theme as { deleted: boolean; value: null };
      expect(themeTombstone.deleted).toBe(true);
      expect(themeTombstone.value).toBeNull();
    });

    it("should run multiple migrations in sequence", async () => {
      await setStoredSchemaVersion(1);
      browserState.storage.counter = {
        hlc: { pt: 1000, lc: 0, node: "abc123" },
        value: 5,
      };

      const v1 = defineSchemaVersion(1, {
        counter: cell({ key: "counter", schema: z.number(), defaultValue: 0, tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        counter: cell({ key: "counter", schema: z.number(), defaultValue: 0, tracked: true }),
        doubled: cell({ key: "doubled", schema: z.number(), defaultValue: 0, tracked: true }),
      });
      const v3 = defineSchemaVersion(3, {
        counter: cell({ key: "counter", schema: z.number(), defaultValue: 0, tracked: true }),
        doubled: cell({ key: "doubled", schema: z.number(), defaultValue: 0, tracked: true }),
        tripled: cell({ key: "tripled", schema: z.number(), defaultValue: 0, tracked: true }),
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
        items: collection({ keyPrefix: "Item:", entities: { item: itemEntity }, tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        items: collection({ keyPrefix: "Item:", entities: { item: newItemEntity }, tracked: true }),
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
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), defaultValue: "light", tracked: true }),
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

    it("should stop on first failing migration in sequence", async () => {
      await setStoredSchemaVersion(1);

      const v1 = defineSchemaVersion(1, {
        a: cell({ key: "a", schema: z.number(), defaultValue: 0, tracked: true }),
      });
      const v2 = defineSchemaVersion(2, {
        a: cell({ key: "a", schema: z.number(), defaultValue: 0, tracked: true }),
        b: cell({ key: "b", schema: z.number(), defaultValue: 0, tracked: true }),
      });
      const v3 = defineSchemaVersion(3, {
        a: cell({ key: "a", schema: z.number(), defaultValue: 0, tracked: true }),
        b: cell({ key: "b", schema: z.number(), defaultValue: 0, tracked: true }),
        c: cell({ key: "c", schema: z.number(), defaultValue: 0, tracked: true }),
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
});
