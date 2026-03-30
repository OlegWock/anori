import { availablePlugins } from "@anori/plugins/all";
import { type AnoriStorage, anoriSchema } from "@anori/utils/storage";
import { type EntityAccessor, listFiles } from "@anori/utils/storage-lib";
import { deleteFile as deleteOpfsFile } from "@anori/utils/storage-lib/opfs";
import { homeFolder } from "@anori/utils/user-data/types";

type GcResult = {
  removedKvRecords: number;
  removedOpfsFiles: number;
};

/**
 * Runs orphan garbage collection on the storage layer.
 *
 * Walks all storage records and OPFS files, determines which ones are
 * "reachable" from the current folder/widget/theme/plugin graph, and
 * removes everything that isn't.
 */
export async function runOrphanGc(storage: AnoriStorage): Promise<GcResult> {
  const result: GcResult = { removedKvRecords: 0, removedOpfsFiles: 0 };

  // ── 1. Build the set of valid identifiers ────────────────────────

  // Valid folder IDs: "home" is always valid + any folder in the folders cell
  const folders = storage.get(anoriSchema.folders) ?? [];
  const validFolderIds = new Set([homeFolder.id, ...folders.map((f) => f.id)]);

  // Valid widget instance IDs: collect from all folder details
  const validInstanceIds = new Set<string>();
  for (const folderId of validFolderIds) {
    const details = storage.get(anoriSchema.folderDetails.folder.byId(folderId));
    if (details?.widgets) {
      for (const widget of details.widgets) {
        validInstanceIds.add(widget.instanceId);
      }
    }
  }

  // Valid plugin IDs
  const validPluginIds = new Set(availablePlugins.map((p) => p.id));

  // Valid custom theme names (for theme background reachability)
  const customThemes = storage.get(anoriSchema.customThemes) ?? [];
  const validThemeNames = new Set(customThemes.map((t) => t.name));

  // ── 2. Remove orphaned collection records ────────────────────────

  const collectionsToCheck: { accessor: EntityAccessor; validIds: Set<string> }[] = [
    // Widget stores: each keyed by widget instanceId
    { accessor: anoriSchema.tasksWidgetStore.store, validIds: validInstanceIds },
    { accessor: anoriSchema.notesWidgetStore.store, validIds: validInstanceIds },
    { accessor: anoriSchema.weatherCurrentWidgetStore.store, validIds: validInstanceIds },
    { accessor: anoriSchema.weatherForecastWidgetStore.store, validIds: validInstanceIds },
    { accessor: anoriSchema.topSitesWidgetStore.store, validIds: validInstanceIds },
    { accessor: anoriSchema.rssWidgetStore.store, validIds: validInstanceIds },
    { accessor: anoriSchema.bookmarkWidgetStore.store, validIds: validInstanceIds },
    // Folder details: keyed by folder ID
    { accessor: anoriSchema.folderDetails.folder, validIds: validFolderIds },
    // Plugin config/storage: keyed by plugin ID
    { accessor: anoriSchema.pluginConfig.config, validIds: validPluginIds },
    { accessor: anoriSchema.pluginStorage.storage, validIds: validPluginIds },
  ];

  for (const { accessor, validIds } of collectionsToCheck) {
    const allRecords = storage.get(accessor.all()) as Record<string, unknown>;
    for (const id of Object.keys(allRecords)) {
      if (!validIds.has(id)) {
        await storage.delete(accessor.byId(id));
        result.removedKvRecords++;
      }
    }
  }

  // ── 3. Remove orphaned file collection records ───────────────────

  // Track OPFS paths referenced by live file metadata records
  const referencedOpfsPaths = new Set<string>();

  // Theme backgrounds — key format is "{themeName}:{variant}"
  const allThemeBgMeta = storage.files.getMeta(anoriSchema.themeBackgrounds.all());
  for (const [key, meta] of Object.entries(allThemeBgMeta)) {
    // Extract theme name: everything before the last ":" (variant is "original" or "blurred")
    const lastColon = key.lastIndexOf(":");
    const themeName = lastColon > 0 ? key.substring(0, lastColon) : key;
    if (!validThemeNames.has(themeName)) {
      await storage.files.delete(anoriSchema.themeBackgrounds.byId(key));
      result.removedKvRecords++;
    } else {
      referencedOpfsPaths.add(meta.path);
    }
  }

  // Custom icons are standalone user-managed entities — not orphaned based
  // on usage. We just track their OPFS paths for the OPFS sweep.
  const allIconMeta = storage.files.getMeta(anoriSchema.customIcons.all());
  for (const meta of Object.values(allIconMeta)) {
    referencedOpfsPaths.add(meta.path);
  }

  // ── 4. Sweep OPFS for unreferenced files ─────────────────────────

  const opfsFiles = await listFiles();

  for (const fileName of opfsFiles) {
    if (!referencedOpfsPaths.has(fileName)) {
      const deleted = await deleteOpfsFile(fileName);
      if (deleted) {
        result.removedOpfsFiles++;
      }
    }
  }

  return result;
}

// @ts-ignore for debug
self.runOrphanGc = runOrphanGc;
