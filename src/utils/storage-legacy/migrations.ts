import {
  type Folder,
  type FolderDetailsInStorage,
  type StorageContent,
  homeFolder,
} from "@anori/utils/user-data/types";

// biome-ignore lint/suspicious/noExplicitAny: Since migration often works with data of shape that no longer matches our types, there is little sense in trying to type it properly
type LegalAny = any;

/**
 * Migrates legacy storage data format.
 * This is still used for importing backups from older versions.
 */
export const migrateStorage = (
  oldStorage: LegalAny,
): { madeChanges: boolean; storage: StorageContent; version: number } => {
  const currentVersion: number = oldStorage.storageVersion ?? 0;
  const { version, storage } = migrations.reduce(
    ({ version, storage }, migration) => {
      if (version < migration.v) {
        const storageCopy = JSON.parse(JSON.stringify(storage));
        storage = migration.migrate(storageCopy);
        storage.storageVersion = migration.v;
        version = migration.v;
      }
      return { version, storage };
    },
    { version: currentVersion, storage: oldStorage },
  );

  return {
    madeChanges: currentVersion !== version,
    storage,
    version,
  };
};

type Migration = {
  v: number;
  migrate: (storage: LegalAny) => Record<string, LegalAny>;
};

const migrations: Migration[] = [
  {
    v: 1,
    migrate: (storage: LegalAny) => {
      const customFolders = storage.folders || [];
      const folders: Folder[] = [homeFolder, ...customFolders];
      folders.map((folder) => {
        const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
        details.widgets.forEach((w) => {
          if (w.pluginId === "notes-plugin") {
            w.widgetId = "notes-widget";
          }

          if (w.pluginId === "tasks-plugin") {
            w.widgetId = "tasks-widget";
          }

          if (w.pluginId === "recently-closed-plugin") {
            w.widgetId = "recently-closed-widget";
          }

          if (w.pluginId === "bookmark-plugin") {
            w.widgetId = w.widgetId.startsWith("bookmark-group") ? "bookmark-group" : "bookmark";
          }
        });
      });

      return storage;
    },
  },
  {
    v: 2,
    migrate: (storage: LegalAny) => {
      const customFolders = storage.folders || [];
      const folders: Folder[] = [homeFolder, ...customFolders];
      folders.map((folder) => {
        const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
        details.widgets.forEach((w: LegalAny) => {
          if (w.pluginId === "datetime-plugin" && ["HH:mm:ss a", "HH:mm:ss A"].includes(w.configutation.timeFormat)) {
            w.configutation.timeFormat = w.configutation.timeFormat.replace("HH", "hh");
          }
        });
      });

      return storage;
    },
  },
  {
    v: 3,
    migrate: (storage: LegalAny) => {
      const customFolders = storage.folders || [];
      const folders: Folder[] = [homeFolder, ...customFolders];
      folders.map((folder) => {
        const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
        details.widgets = details.widgets.filter((widget) => widget.pluginId !== "search-plugin");
      });

      return storage;
    },
  },
  {
    v: 4,
    migrate: (storage: LegalAny) => {
      const customFolders = storage.folders || [];
      const folders: Folder[] = [homeFolder, ...customFolders];
      folders.map((folder) => {
        const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
        details.widgets.forEach((w: LegalAny) => {
          w.configuration = w.configutation;
          // biome-ignore lint/performance/noDelete: We want to remove this prop from storage
          delete w.configutation;
        });
      });

      return storage;
    },
  },
  {
    v: 5,
    migrate: (storage: LegalAny) => {
      const customFolders = storage.folders || [];
      const folders: Folder[] = [homeFolder, ...customFolders];
      folders.map((folder) => {
        const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
        details.widgets = details.widgets.filter((widget) => widget.pluginId !== "label-plugin");
      });

      return storage;
    },
  },
].sort((a, b) => a.v - b.v);
