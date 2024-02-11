import { Folder, FolderDetailsInStorage, homeFolder } from "@utils/user-data/types";
import browser from 'webextension-polyfill';

export const globalStorageCache = {
    loaded: false,
    content: {} as any,
};

export const loadAndMigrateStorage = async () => {
    const currentStorage = await browser.storage.local.get(null);
    const { madeChanges, storage, version } = migrateStorage(currentStorage);
    if (madeChanges) {
        await browser.storage.local.set(storage);
    }

    globalStorageCache.content = storage;
    globalStorageCache.loaded = true;
    browser.storage.local.onChanged.addListener((changes) => {
        Object.entries(changes).forEach(([key, { newValue }]) => {
            globalStorageCache.content[key] = newValue;
        });
    });
};

export const migrateStorage = (oldStorage: any): any => {
    const currentVersion: number = oldStorage.storageVersion ?? 0;
    const { version, storage } = migrations.reduce(({ version, storage }, migration) => {
        if (version < migration.v) {
            const storageCopy = JSON.parse(JSON.stringify(storage));
            storage = migration.migrate(storageCopy);
            storage.storageVersion = migration.v;
            version = migration.v;
        }
        return { version, storage };
    }, { version: currentVersion, storage: oldStorage });

    return {
        madeChanges: currentVersion !== version,
        storage,
        version,
    };
};

type Migration = {
    v: number,
    migrate: (storage: any) => any,
};

const migrations: Migration[] = [
    {
        v: 1,
        migrate: (storage: any) => {
            const customFolders = storage.folders || [];
            const folders: Folder[] = [homeFolder, ...customFolders];
            folders.map((folder) => {
                const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
                details.widgets.forEach(w => {
                    if (w.pluginId === 'notes-plugin') {
                        w.widgetId = 'notes-widget';
                    }

                    if (w.pluginId === 'tasks-plugin') {
                        w.widgetId = 'tasks-widget';
                    }

                    if (w.pluginId === 'recently-closed-plugin') {
                        w.widgetId = 'recently-closed-widget';
                    }

                    if (w.pluginId === 'bookmark-plugin') {
                        w.widgetId = w.widgetId.startsWith('bookmark-group') ? 'bookmark-group' : 'bookmark';
                    }
                });
            });

            return storage;
        }
    },
    {
        v: 2,
        migrate: (storage: any) => {
            const customFolders = storage.folders || [];
            const folders: Folder[] = [homeFolder, ...customFolders];
            folders.map((folder) => {
                const details: FolderDetailsInStorage = storage[`Folder.${folder.id}`] || { widgets: [] };
                details.widgets.forEach(w => {
                    if (w.pluginId === 'datetime-plugin' && ['HH:mm:ss a', 'HH:mm:ss A'].includes(w.configutation.timeFormat)) {
                        w.configutation.timeFormat = w.configutation.timeFormat.replace('HH', 'hh');
                    }
                });
            });

            return storage;
        }
    }
].sort((a, b) => a.v - b.v);