import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  cell,
  collection,
  createMigration,
  defineSchemaVersion,
  defineVersionedSchema,
  entity,
  getMigrationPath,
  isCellDescriptor,
  isCellQuery,
  isCollectionAllQuery,
  isCollectionByIdQuery,
  isCollectionDescriptor,
  isCollectionQuery,
  isEntityDescriptor,
} from "../schema";

describe("Schema Definition", () => {
  describe("cell", () => {
    it("should create a cell descriptor", () => {
      const themeCell = cell({
        key: "theme",
        schema: z.string(),
        defaultValue: "Forest",
        tracked: true,
      });

      expect(isCellDescriptor(themeCell)).toBe(true);
      expect(themeCell.key).toBe("theme");
      expect(themeCell.defaultValue).toBe("Forest");
      expect(themeCell.tracked).toBe(true);
    });

    it("should use provided key", () => {
      const themeCell = cell({
        key: "myTheme",
        schema: z.string(),
        tracked: false,
      });

      expect(themeCell.key).toBe("myTheme");
    });
  });

  describe("entity", () => {
    it("should create an entity descriptor", () => {
      const folderEntity = entity({
        brand: "FolderDetails",
        schema: z.object({ name: z.string() }),
      });

      expect(isEntityDescriptor(folderEntity)).toBe(true);
      expect(folderEntity.brand).toBe("FolderDetails");
    });
  });

  describe("collection", () => {
    it("should create a collection descriptor", () => {
      const folders = collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({
            brand: "FolderDetails",
            schema: z.object({ name: z.string() }),
          }),
        },
        tracked: true,
      });

      expect(isCollectionDescriptor(folders)).toBe(true);
      expect(folders.keyPrefix).toBe("Folder");
      expect(folders.tracked).toBe(true);
    });

    it("should support .all() query", () => {
      const folders = collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({
            brand: "FolderDetails",
            schema: z.object({ name: z.string() }),
          }),
        },
        tracked: true,
      });

      const allQuery = folders.all();

      expect(isCollectionQuery(allQuery)).toBe(true);
      expect(isCollectionAllQuery(allQuery)).toBe(true);
      expect(allQuery.queryType).toBe("all");
      expect(allQuery.keyPrefix).toBe("Folder");
      expect(allQuery.brand).toBeUndefined();
    });

    it("should support .byId() query", () => {
      const folders = collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({
            brand: "FolderDetails",
            schema: z.object({ name: z.string() }),
          }),
        },
        tracked: true,
      });

      const byIdQuery = folders.byId("home");

      expect(isCollectionQuery(byIdQuery)).toBe(true);
      expect(isCollectionByIdQuery(byIdQuery)).toBe(true);
      expect(byIdQuery.queryType).toBe("byId");
      expect(byIdQuery.keyPrefix).toBe("Folder");
      expect(byIdQuery.id).toBe("home");
    });

    it("should support entity-specific queries", () => {
      const widgets = collection({
        keyPrefix: "WidgetStorage",
        entities: {
          notes: entity({
            brand: "NotesWidget",
            schema: z.object({ content: z.string() }),
          }),
          todos: entity({
            brand: "TodoWidget",
            schema: z.object({ items: z.array(z.string()) }),
          }),
        },
        tracked: true,
      });

      const allNotes = widgets.notes.all();
      expect(isCollectionAllQuery(allNotes)).toBe(true);
      expect(allNotes.brand).toBe("NotesWidget");

      const specificTodo = widgets.todos.byId("123");
      expect(isCollectionByIdQuery(specificTodo)).toBe(true);
      expect(specificTodo.brand).toBe("TodoWidget");
      expect(specificTodo.id).toBe("123");
    });
  });

  describe("defineSchemaVersion", () => {
    it("should create a schema version", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({
          key: "theme",
          schema: z.string(),
          defaultValue: "Forest",
          tracked: true,
        }),
        folders: collection({
          keyPrefix: "Folder",
          entities: {
            folder: entity({
              brand: "FolderDetails",
              schema: z.object({ name: z.string() }),
            }),
          },
          tracked: true,
        }),
      });

      expect(v1.version).toBe(1);
      expect(v1.definition.theme.key).toBe("theme");
      expect(v1.definition.folders.keyPrefix).toBe("Folder");
    });

    it("should allow querying through schema", () => {
      const v1 = defineSchemaVersion(1, {
        folders: collection({
          keyPrefix: "Folder",
          entities: {
            folder: entity({
              brand: "FolderDetails",
              schema: z.object({ name: z.string() }),
            }),
          },
          tracked: true,
        }),
      });

      const allQuery = v1.definition.folders.all();
      expect(allQuery.keyPrefix).toBe("Folder");

      const byIdQuery = v1.definition.folders.byId("home");
      expect(byIdQuery.keyPrefix).toBe("Folder");
      expect(byIdQuery.id).toBe("home");
    });
  });

  describe("defineVersionedSchema", () => {
    it("should create a versioned schema", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1],
        migrations: [],
      });

      expect(schema.currentVersion).toBe(1);
      expect(schema.versions).toHaveLength(1);
      expect(schema.latestSchema).toBe(v1);
    });

    it("should identify latest version from multiple", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
        color: cell({ key: "color", schema: z.string(), tracked: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v2],
        migrations: [],
      });

      expect(schema.currentVersion).toBe(2);
      expect(schema.latestSchema.version).toBe(2);
    });

    it("should throw if no versions provided", () => {
      expect(() =>
        defineVersionedSchema({
          versions: [],
          migrations: [],
        }),
      ).toThrow("At least one schema version is required");
    });
  });

  describe("createMigration", () => {
    it("should create a migration descriptor", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
        color: cell({ key: "color", schema: z.string(), defaultValue: "blue", tracked: true }),
      });

      const migration = createMigration(v1, v2, async ({ to }) => {
        to.set("color", "blue");
      });

      expect(migration.fromVersion).toBe(1);
      expect(migration.toVersion).toBe(2);
      expect(typeof migration.migrate).toBe("function");
    });
  });

  describe("getMigrationPath", () => {
    it("should return empty array when already at target version", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1],
        migrations: [],
      });

      expect(getMigrationPath(schema, 1, 1)).toEqual([]);
    });

    it("should return migration path for multiple steps", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const v2 = defineSchemaVersion(2, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const v3 = defineSchemaVersion(3, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const m1to2 = createMigration(v1, v2, async () => {});
      const m2to3 = createMigration(v2, v3, async () => {});

      const schema = defineVersionedSchema({
        versions: [v1, v2, v3],
        migrations: [m1to2, m2to3],
      });

      const path = getMigrationPath(schema, 1, 3);

      expect(path).toHaveLength(2);
      expect(path[0].fromVersion).toBe(1);
      expect(path[0].toVersion).toBe(2);
      expect(path[1].fromVersion).toBe(2);
      expect(path[1].toVersion).toBe(3);
    });

    it("should throw if migration not found", () => {
      const v1 = defineSchemaVersion(1, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const v3 = defineSchemaVersion(3, {
        theme: cell({ key: "theme", schema: z.string(), tracked: true }),
      });

      const schema = defineVersionedSchema({
        versions: [v1, v3],
        migrations: [],
      });

      expect(() => getMigrationPath(schema, 1, 3)).toThrow("No migration found from version 1");
    });
  });

  describe("type guards", () => {
    it("isCellQuery should identify cell descriptors as queries", () => {
      const themeCell = cell({ key: "theme", schema: z.string(), tracked: true });
      expect(isCellQuery(themeCell)).toBe(true);
    });

    it("isCollectionQuery should not match cell descriptors", () => {
      const themeCell = cell({ key: "theme", schema: z.string(), tracked: true });
      expect(isCollectionQuery(themeCell)).toBe(false);
    });
  });
});
