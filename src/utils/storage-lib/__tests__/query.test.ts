import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractIdFromKey, getStorageKey, isKeyMatchingPrefix, resolveQuery } from "../query";
import { cell, collection, entity } from "../schema";

describe("Query Resolution", () => {
  describe("resolveQuery", () => {
    it("should resolve cell query", () => {
      const themeCell = cell({ key: "theme", schema: z.string(), tracked: true, includedInBackup: true });

      const resolved = resolveQuery(themeCell);

      expect(resolved.type).toBe("cell");
      expect(resolved.key).toBe("theme");
    });

    it("should resolve collection.byId query", () => {
      const folders = collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({ brand: "FolderDetails", schema: z.object({ name: z.string() }) }),
        },
        tracked: true,
        includedInBackup: true,
      });

      const resolved = resolveQuery(folders.byId("home"));

      expect(resolved.type).toBe("collectionById");
      expect(resolved.key).toBe("Folder:home");
      expect(resolved.brand).toBeUndefined();
    });

    it("should resolve collection.byId query with brand", () => {
      const widgets = collection({
        keyPrefix: "Widget",
        entities: {
          notes: entity({ brand: "NotesWidget", schema: z.object({ content: z.string() }) }),
        },
        tracked: true,
        includedInBackup: true,
      });

      const resolved = resolveQuery(widgets.notes.byId("123"));

      expect(resolved.type).toBe("collectionById");
      expect(resolved.key).toBe("Widget:123");
      expect(resolved.brand).toBe("NotesWidget");
    });

    it("should resolve collection.all query", () => {
      const folders = collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({ brand: "FolderDetails", schema: z.object({ name: z.string() }) }),
        },
        tracked: true,
        includedInBackup: true,
      });

      const resolved = resolveQuery(folders.all());

      expect(resolved.type).toBe("collectionAll");
      expect(resolved.keyPrefix).toBe("Folder");
      expect(resolved.brand).toBeUndefined();
    });

    it("should resolve collection.all query with brand filter", () => {
      const widgets = collection({
        keyPrefix: "Widget",
        entities: {
          notes: entity({ brand: "NotesWidget", schema: z.object({ content: z.string() }) }),
        },
        tracked: true,
        includedInBackup: true,
      });

      const resolved = resolveQuery(widgets.notes.all());

      expect(resolved.type).toBe("collectionAll");
      expect(resolved.keyPrefix).toBe("Widget");
      expect(resolved.brand).toBe("NotesWidget");
    });
  });

  describe("getStorageKey", () => {
    it("should get key for cell", () => {
      const themeCell = cell({ key: "theme", schema: z.string(), tracked: true, includedInBackup: true });

      expect(getStorageKey(themeCell)).toBe("theme");
    });

    it("should get key for collection.byId", () => {
      const folders = collection({
        keyPrefix: "Folder",
        entities: {
          folder: entity({ brand: "FolderDetails", schema: z.object({ name: z.string() }) }),
        },
        tracked: true,
        includedInBackup: true,
      });

      expect(getStorageKey(folders.byId("home"))).toBe("Folder:home");
    });
  });

  describe("isKeyMatchingPrefix", () => {
    it("should match keys with prefix", () => {
      expect(isKeyMatchingPrefix("Folder:home", "Folder")).toBe(true);
      expect(isKeyMatchingPrefix("Folder:work", "Folder")).toBe(true);
    });

    it("should not match keys without prefix", () => {
      expect(isKeyMatchingPrefix("theme", "Folder")).toBe(false);
      expect(isKeyMatchingPrefix("FolderDetails", "Folder")).toBe(false);
    });

    it("should not match partial prefix", () => {
      expect(isKeyMatchingPrefix("Folder", "Folder")).toBe(false);
    });
  });

  describe("extractIdFromKey", () => {
    it("should extract id from key", () => {
      expect(extractIdFromKey("Folder:home", "Folder")).toBe("home");
      expect(extractIdFromKey("Widget:123", "Widget")).toBe("123");
    });

    it("should handle ids with colons", () => {
      expect(extractIdFromKey("Folder:my:complex:id", "Folder")).toBe("my:complex:id");
    });

    it("should return null for non-matching keys", () => {
      expect(extractIdFromKey("theme", "Folder")).toBeNull();
      expect(extractIdFromKey("Other:key", "Folder")).toBeNull();
    });
  });
});
