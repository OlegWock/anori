import { assertValue } from "@anori/utils/asserts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type MockBrowserStorageState, createMockBrowserStorage, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));
vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

import { initializeAnoriStorage } from "../anori-init";
import { anoriSchema } from "../anori-schema";
import { HLC_STATE_KEY, SCHEMA_VERSION_KEY } from "../keys";
import { getGlobalStorage, isStorageInitialized } from "../react";
import { isStorageRecord } from "../types";

describe("Anori Storage Initialization", () => {
  beforeEach(() => {
    resetMockBrowserStorage(browserState);
  });

  describe("fresh install", () => {
    it("should set schema version and return storage on fresh install", async () => {
      const result = await initializeAnoriStorage();

      expect(result.success).toBe(true);
      expect(result.wasLegacyMigration).toBe(false);
      expect(result.fromVersion).toBe(0);
      expect(result.toVersion).toBe(anoriSchema.currentVersion);
      expect(browserState.storage[SCHEMA_VERSION_KEY]).toBe(anoriSchema.currentVersion);

      // Storage should be created and set as global
      expect(result.storage).toBeDefined();
      expect(isStorageInitialized()).toBe(true);
      expect(getGlobalStorage()).toBe(result.storage);
    });

    it("should allow using the returned storage", async () => {
      const result = await initializeAnoriStorage();
      assertValue(result.storage);
      const storage = result.storage;

      // Set and get folders
      await storage.set(anoriSchema.latestSchema.definition.folders, [{ id: "test", name: "Test", icon: "star" }]);
      const folders = storage.get(anoriSchema.latestSchema.definition.folders);
      expect(folders).toEqual([{ id: "test", name: "Test", icon: "star" }]);

      // Set and get newTabTitle
      await storage.set(anoriSchema.latestSchema.definition.newTabTitle, "My Tab");
      const title = storage.get(anoriSchema.latestSchema.definition.newTabTitle);
      expect(title).toBe("My Tab");

      // Set and get folder details
      const folderDetailsQuery = anoriSchema.latestSchema.definition.folderDetails.folder.byId("home");
      await storage.set(folderDetailsQuery, { widgets: [{ instanceId: "w1" } as never] });
      const details = storage.get(folderDetailsQuery);
      expect(details?.widgets).toHaveLength(1);
    });
  });

  describe("legacy migration", () => {
    it("should detect and migrate legacy storage", async () => {
      browserState.storage = {
        storageVersion: 5,
        folders: [
          { id: "work", name: "Work", icon: "briefcase" },
          { id: "personal", name: "Personal", icon: "user" },
        ],
        newTabTitle: "My Dashboard",
        "Folder.home": { widgets: [{ instanceId: "widget1", pluginId: "notes", widgetId: "note" }] },
        "Folder.work": { widgets: [{ instanceId: "widget2", pluginId: "tasks", widgetId: "todo" }] },
        "Folder.personal": { widgets: [] },
      };

      const result = await initializeAnoriStorage();

      expect(result.success).toBe(true);
      expect(result.wasLegacyMigration).toBe(true);
      expect(result.toVersion).toBe(anoriSchema.currentVersion);

      // Check schema version was set
      expect(browserState.storage[SCHEMA_VERSION_KEY]).toBe(anoriSchema.currentVersion);

      // Check HLC state was created
      expect(browserState.storage[HLC_STATE_KEY]).toBeDefined();

      // Check folders cell was migrated
      const foldersRecord = browserState.storage.folders;
      expect(isStorageRecord(foldersRecord)).toBe(true);
      if (isStorageRecord(foldersRecord)) {
        expect(foldersRecord.value).toEqual([
          { id: "work", name: "Work", icon: "briefcase" },
          { id: "personal", name: "Personal", icon: "user" },
        ]);
        expect(foldersRecord.deleted).toBe(false);
      }

      // Check newTabTitle cell was migrated
      const titleRecord = browserState.storage.newTabTitle;
      expect(isStorageRecord(titleRecord)).toBe(true);
      if (isStorageRecord(titleRecord)) {
        expect(titleRecord.value).toBe("My Dashboard");
      }

      // Check folder details collection was migrated (note: key format changed from Folder.id to Folder:id)
      const homeFolder = browserState.storage["Folder:home"];
      expect(isStorageRecord(homeFolder)).toBe(true);
      if (isStorageRecord(homeFolder)) {
        expect(homeFolder.brand).toBe("FolderDetails");
        expect((homeFolder.value as { widgets: unknown[] }).widgets).toHaveLength(1);
      }

      const workFolder = browserState.storage["Folder:work"];
      expect(isStorageRecord(workFolder)).toBe(true);
      if (isStorageRecord(workFolder)) {
        expect(workFolder.brand).toBe("FolderDetails");
        expect((workFolder.value as { widgets: unknown[] }).widgets).toHaveLength(1);
      }

      // Storage should be created and usable
      expect(result.storage).toBeDefined();
      assertValue(result.storage);
      const storage = result.storage;

      // Can read migrated data via storage API
      const folders = storage.get(anoriSchema.latestSchema.definition.folders);
      expect(folders).toEqual([
        { id: "work", name: "Work", icon: "briefcase" },
        { id: "personal", name: "Personal", icon: "user" },
      ]);

      const title = storage.get(anoriSchema.latestSchema.definition.newTabTitle);
      expect(title).toBe("My Dashboard");

      // Collection data can also be read via storage API
      const allFolderDetails = storage.get(anoriSchema.latestSchema.definition.folderDetails.all());
      expect(Object.keys(allFolderDetails)).toContain("home");
    });

    it("should handle missing optional fields gracefully", async () => {
      browserState.storage = {
        storageVersion: 3,
        // No folders, newTabTitle, or folder details
      };

      const result = await initializeAnoriStorage();

      expect(result.success).toBe(true);
      expect(result.wasLegacyMigration).toBe(true);

      // Should have default values
      const foldersRecord = browserState.storage.folders;
      expect(isStorageRecord(foldersRecord)).toBe(true);
      if (isStorageRecord(foldersRecord)) {
        expect(foldersRecord.value).toEqual([]);
      }

      const titleRecord = browserState.storage.newTabTitle;
      expect(isStorageRecord(titleRecord)).toBe(true);
      if (isStorageRecord(titleRecord)) {
        expect(titleRecord.value).toBe("Anori");
      }

      // Home folder should still be created
      const homeFolder = browserState.storage["Folder:home"];
      expect(isStorageRecord(homeFolder)).toBe(true);
      if (isStorageRecord(homeFolder)) {
        expect((homeFolder.value as { widgets: unknown[] }).widgets).toEqual([]);
      }
    });

    it("should not run legacy migration if schema version is already set", async () => {
      browserState.storage = {
        [SCHEMA_VERSION_KEY]: 1,
        storageVersion: 5,
        folders: [{ id: "test", name: "Test", icon: "star" }],
      };

      const result = await initializeAnoriStorage();

      expect(result.success).toBe(true);
      expect(result.wasLegacyMigration).toBe(false);

      // Should not have migrated the folders
      expect(isStorageRecord(browserState.storage.folders)).toBe(false);
    });
  });

  describe("schema migrations", () => {
    it("should run schema migrations when needed", async () => {
      browserState.storage = {
        [SCHEMA_VERSION_KEY]: anoriSchema.currentVersion,
      };

      const result = await initializeAnoriStorage();

      expect(result.success).toBe(true);
      expect(result.wasLegacyMigration).toBe(false);
      expect(result.fromVersion).toBe(anoriSchema.currentVersion);
      expect(result.toVersion).toBe(anoriSchema.currentVersion);
    });
  });
});
