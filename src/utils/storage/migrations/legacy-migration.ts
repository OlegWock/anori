import type { Language } from "@anori/translations/metadata";
import { asyncIterableToArray } from "@anori/utils/misc";
import browser from "webextension-polyfill";
import { type CustomTheme, type Folder, type FolderDetails, anoriSchema } from "../anori-schema";
import { type HlcTimestamp, createHlc, generateNodeId } from "../hlc";
import { HLC_STATE_KEY, SCHEMA_VERSION_KEY } from "../keys";
import { generateFilePath, writeFile } from "../opfs";
import type { FileMetaValue, StorageRecord } from "../types";

const LEGACY_STORAGE_VERSION_KEY = "storageVersion";

type LegacyFolderDetails = { widgets: unknown[] };

type LegacyStorageContent = {
  // Core
  folders?: Folder[];
  storageVersion?: number;
  newTabTitle?: string;

  // Appearance
  theme?: string;
  customThemes?: CustomTheme[];

  // Layout
  sidebarOrientation?: "vertical" | "horizontal" | "auto";
  autoHideSidebar?: boolean;
  showBookmarksBar?: boolean;

  // Navigation
  rememberLastFolder?: boolean;
  lastFolder?: string;

  // Display mode
  compactMode?: boolean;
  automaticCompactMode?: boolean;
  automaticCompactModeThreshold?: number;
  showLoadAnimation?: boolean;

  // Localization
  language?: Language;

  // User state
  hasUnreadReleaseNotes?: boolean;
  finishedOnboarding?: boolean;

  // Analytics
  userId?: string;
  analyticsEnabled?: boolean;
  analyticsLastSend?: number;
  dailyUsageMetrics?: Record<string, number>;
  performanceAvgLcp?: { avg: number; n: number };
  performanceRawInp?: number[];

  // Cloud
  cloudAccount?: { sessionToken: string; email: string; userId: string } | null;
};

/**
 * Checks if the storage contains legacy data that needs to be migrated.
 * Legacy storage is identified by having `storageVersion` key but no `__schema_version`.
 */
export async function isLegacyStorage(): Promise<boolean> {
  const data = await browser.storage.local.get([SCHEMA_VERSION_KEY, LEGACY_STORAGE_VERSION_KEY]);
  const newSchemaVersion = data[SCHEMA_VERSION_KEY];
  const legacyVersion = data[LEGACY_STORAGE_VERSION_KEY];

  return newSchemaVersion === undefined && legacyVersion !== undefined;
}

/**
 * Wraps a value in a StorageRecord with an HLC timestamp.
 */
function wrapValue<T>(value: T, hlc: HlcTimestamp, brand?: string): StorageRecord<T> {
  return {
    hlc,
    value,
    deleted: false,
    brand,
  };
}

/**
 * Migrates legacy storage format to the new schema format.
 * This handles the transition from the old `storageVersion` system to the new `__schema_version` system.
 */
export async function migrateFromLegacy(): Promise<void> {
  const allData = (await browser.storage.local.get(null)) as LegacyStorageContent & Record<string, unknown>;

  const hlc = createHlc(generateNodeId());
  const newData: Record<string, unknown> = {};

  // ============================================================================
  // Migrate simple cells
  // ============================================================================

  // Core data
  newData.folders = wrapValue(allData.folders ?? [], hlc.tick());
  newData.newTabTitle = wrapValue(allData.newTabTitle ?? "Anori", hlc.tick());

  // Appearance
  newData.theme = wrapValue(allData.theme ?? "Greenery", hlc.tick());
  newData.customThemes = wrapValue(allData.customThemes ?? [], hlc.tick());

  // Layout
  newData.sidebarOrientation = wrapValue(allData.sidebarOrientation ?? "auto", hlc.tick());
  newData.autoHideSidebar = wrapValue(allData.autoHideSidebar ?? false, hlc.tick());
  newData.showBookmarksBar = wrapValue(allData.showBookmarksBar ?? false, hlc.tick());

  // Navigation
  newData.rememberLastFolder = wrapValue(allData.rememberLastFolder ?? false, hlc.tick());
  if (allData.lastFolder !== undefined) {
    newData.lastFolder = wrapValue(allData.lastFolder, hlc.tick());
  }

  // Display mode
  newData.compactMode = wrapValue(allData.compactMode ?? false, hlc.tick());
  newData.automaticCompactMode = wrapValue(allData.automaticCompactMode ?? true, hlc.tick());
  newData.automaticCompactModeThreshold = wrapValue(allData.automaticCompactModeThreshold ?? 1500, hlc.tick());
  newData.showLoadAnimation = wrapValue(allData.showLoadAnimation ?? false, hlc.tick());

  // Localization
  newData.language = wrapValue(allData.language ?? "en", hlc.tick());

  // User state
  newData.hasUnreadReleaseNotes = wrapValue(allData.hasUnreadReleaseNotes ?? false, hlc.tick());
  newData.finishedOnboarding = wrapValue(allData.finishedOnboarding ?? false, hlc.tick());

  // Analytics
  if (allData.userId) {
    newData.userId = wrapValue(allData.userId, hlc.tick());
  }
  newData.analyticsEnabled = wrapValue(allData.analyticsEnabled ?? false, hlc.tick());
  newData.analyticsLastSend = wrapValue(allData.analyticsLastSend ?? 0, hlc.tick());
  newData.dailyUsageMetrics = wrapValue(allData.dailyUsageMetrics ?? {}, hlc.tick());
  newData.performanceAvgLcp = wrapValue(allData.performanceAvgLcp ?? { avg: 0, n: 0 }, hlc.tick());
  newData.performanceRawInp = wrapValue(allData.performanceRawInp ?? [], hlc.tick());

  // Cloud
  if (allData.cloudAccount !== undefined) {
    newData.cloudAccount = wrapValue(allData.cloudAccount, hlc.tick());
  }

  const keysToDelete = new Set<string>();
  keysToDelete.add(LEGACY_STORAGE_VERSION_KEY);

  // ============================================================================
  // Migrate folder details collection (Folder.{id} -> Folder:{id})
  // ============================================================================

  const folderIds = new Set<string>();
  folderIds.add("home");

  const folders = allData.folders ?? [];
  for (const folder of folders) {
    folderIds.add(folder.id);
  }

  for (const key of Object.keys(allData)) {
    if (key.startsWith("Folder.")) {
      keysToDelete.add(key);
      const id = key.substring("Folder.".length);
      folderIds.add(id);
    }
  }

  for (const folderId of folderIds) {
    const legacyKey = `Folder.${folderId}`;
    const newKey = `Folder:${folderId}`;
    const legacyDetails = allData[legacyKey] as LegacyFolderDetails | undefined;

    const details: FolderDetails = {
      widgets: Array.isArray(legacyDetails?.widgets) ? (legacyDetails.widgets as FolderDetails["widgets"]) : [],
    };

    newData[newKey] = wrapValue(details, hlc.tick(), "FolderDetails");
  }

  // ============================================================================
  // Migrate plugin config collection (PluginConfig.{id} -> PluginConfig:{id})
  // ============================================================================

  for (const key of Object.keys(allData)) {
    if (key.startsWith("PluginConfig.")) {
      const id = key.substring("PluginConfig.".length);
      const newKey = `PluginConfig:${id}`;
      newData[newKey] = wrapValue(allData[key], hlc.tick(), "PluginConfig");
    }
  }

  // ============================================================================
  // Migrate widget storage to typed collections
  // ============================================================================

  // Build a map of instanceId -> widgetId from all folder details
  const widgetIdByInstanceId = new Map<string, string>();
  for (const folderId of folderIds) {
    const legacyKey = `Folder.${folderId}`;
    const legacyDetails = allData[legacyKey] as LegacyFolderDetails | undefined;
    if (legacyDetails?.widgets) {
      for (const widget of legacyDetails.widgets as Array<{ instanceId?: string; widgetId?: string }>) {
        if (widget.instanceId && widget.widgetId) {
          widgetIdByInstanceId.set(widget.instanceId, widget.widgetId);
        }
      }
    }
  }

  // Widget ID to collection key prefix and brand mapping
  const widgetStoreMapping: Record<string, { keyPrefix: string; brand: string }> = {
    "tasks-widget": { keyPrefix: "TasksWidgetStore", brand: "TasksWidgetStore" },
    "notes-widget": { keyPrefix: "NotesWidgetStore", brand: "NotesWidgetStore" },
    "weather-current": { keyPrefix: "WeatherCurrentWidgetStore", brand: "WeatherCurrentWidgetStore" },
    "weather-forecast": { keyPrefix: "WeatherForecastWidgetStore", brand: "WeatherForecastWidgetStore" },
    "top-sites-horizontal": { keyPrefix: "TopSitesWidgetStore", brand: "TopSitesWidgetStore" },
    "top-sites-vertical": { keyPrefix: "TopSitesWidgetStore", brand: "TopSitesWidgetStore" },
    "rss-feed": { keyPrefix: "RssWidgetStore", brand: "RssWidgetStore" },
    "rss-latest-post": { keyPrefix: "RssWidgetStore", brand: "RssWidgetStore" },
    bookmark: { keyPrefix: "BookmarkWidgetStore", brand: "BookmarkWidgetStore" },
  };

  for (const key of Object.keys(allData)) {
    if (key.startsWith("WidgetStorage.")) {
      keysToDelete.add(key);
      const instanceId = key.substring("WidgetStorage.".length);
      const widgetId = widgetIdByInstanceId.get(instanceId);
      const mapping = widgetId ? widgetStoreMapping[widgetId] : undefined;

      if (mapping) {
        // Migrate to typed collection
        const newKey = `${mapping.keyPrefix}:${instanceId}`;
        newData[newKey] = wrapValue(allData[key], hlc.tick(), mapping.brand);
      }
    }
  }

  // ============================================================================
  // Migrate plugin storage collection (PluginStorage.{id} -> PluginStorage:{id})
  // ============================================================================

  for (const key of Object.keys(allData)) {
    if (key.startsWith("PluginStorage.")) {
      keysToDelete.add(key);
      const id = key.substring("PluginStorage.".length);
      const newKey = `PluginStorage:${id}`;
      newData[newKey] = wrapValue(allData[key], hlc.tick(), "PluginStorage");
    }
  }

  // ============================================================================
  // Migrate custom icons from OPFS (custom-icons/ -> anori-managed-storage/)
  // ============================================================================

  const opfsRoot = await navigator.storage.getDirectory();

  try {
    const iconsDir = await opfsRoot.getDirectoryHandle("custom-icons");
    const iconFiles = await asyncIterableToArray(iconsDir.values());

    for (const handle of iconFiles) {
      if (handle.kind !== "file") continue;
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const blob = new Blob([file], { type: getMimeFromFilename(fileHandle.name) });

      const path = generateFilePath();
      await writeFile(path, blob);

      const metaKey = `CustomIcon:${fileHandle.name}`;
      const meta: FileMetaValue<{ name: string; mimeType?: string }> = {
        path,
        properties: {
          name: fileHandle.name, // TODO: maybe this needs to remove the extension?
          mimeType: blob.type || undefined,
        },
      };
      newData[metaKey] = wrapValue(meta, hlc.tick(), "CustomIcon");
    }

    console.log("[Storage] Migrated custom icons to new storage");
  } catch (err) {
    if (!(err instanceof DOMException) || err.name !== "NotFoundError") {
      console.error("[Storage] Error migrating custom icons:", err);
    }
    // No custom-icons folder exists, skip
  }

  // ============================================================================
  // Migrate theme backgrounds from OPFS (custom-themes/ -> anori-managed-storage/)
  // ============================================================================

  try {
    const themesDir = await opfsRoot.getDirectoryHandle("custom-themes");
    const themeFiles = await asyncIterableToArray(themesDir.values());

    for (const handle of themeFiles) {
      if (handle.kind !== "file") continue;
      const fileHandle = handle as FileSystemFileHandle;
      const filename = fileHandle.name;

      // Parse filename: {themeName}-original or {themeName}-blurred
      let themeName: string;
      let variant: "original" | "blurred";

      if (filename.endsWith("-original")) {
        themeName = filename.slice(0, -"-original".length);
        variant = "original";
      } else if (filename.endsWith("-blurred")) {
        themeName = filename.slice(0, -"-blurred".length);
        variant = "blurred";
      } else {
        console.warn(`[Storage] Skipping unknown theme background file: ${filename}`);
        continue;
      }

      const file = await fileHandle.getFile();
      const blob = new Blob([file]);

      const path = generateFilePath();
      await writeFile(path, blob);

      // Use a composite key: ThemeBackground:{themeName}:{variant}
      const metaKey = `ThemeBackground:${themeName}:${variant}`;
      const meta: FileMetaValue<{ themeName: string; variant: "original" | "blurred" }> = {
        path,
        properties: {
          themeName,
          variant,
        },
      };
      newData[metaKey] = wrapValue(meta, hlc.tick(), "ThemeBackground");
    }

    console.log("[Storage] Migrated theme backgrounds to new storage");
  } catch (err) {
    if (!(err instanceof DOMException) || err.name !== "NotFoundError") {
      console.error("[Storage] Error migrating theme backgrounds:", err);
    }
    // No custom-themes folder exists, skip
  }

  // ============================================================================
  // Purge orphaned records
  // ============================================================================

  // Collect all valid widget instanceIds from migrated folder details
  const validInstanceIds = new Set<string>();
  for (const folderId of folderIds) {
    const legacyKey = `Folder.${folderId}`;
    const legacyDetails = allData[legacyKey] as LegacyFolderDetails | undefined;
    if (legacyDetails?.widgets) {
      for (const widget of legacyDetails.widgets as Array<{ instanceId?: string }>) {
        if (widget.instanceId) {
          validInstanceIds.add(widget.instanceId);
        }
      }
    }
  }

  // Valid folder IDs are: "home" + all folders in the folders array
  const validFolderIds = new Set<string>(["home"]);
  for (const folder of folders) {
    validFolderIds.add(folder.id);
  }

  // Remove orphaned records from newData
  const widgetStorePrefixes = [
    "TasksWidgetStore:",
    "NotesWidgetStore:",
    "WeatherCurrentWidgetStore:",
    "WeatherForecastWidgetStore:",
    "TopSitesWidgetStore:",
    "RssWidgetStore:",
    "BookmarkWidgetStore:",
  ];

  let orphanedCount = 0;
  for (const key of Object.keys(newData)) {
    // Check for orphaned widget storage
    for (const prefix of widgetStorePrefixes) {
      if (key.startsWith(prefix)) {
        const instanceId = key.substring(prefix.length);
        if (!validInstanceIds.has(instanceId)) {
          delete newData[key];
          orphanedCount++;
        }
        break;
      }
    }

    // Check for orphaned folder details
    if (key.startsWith("Folder:")) {
      const folderId = key.substring("Folder:".length);
      if (!validFolderIds.has(folderId)) {
        delete newData[key];
        orphanedCount++;
      }
    }
  }

  if (orphanedCount > 0) {
    console.log(`[Storage] Purged ${orphanedCount} orphaned records during migration`);
  }

  // ============================================================================
  // Finalize migration
  // ============================================================================

  // Store HLC state
  newData[HLC_STATE_KEY] = hlc.getState();

  // Set the new schema version
  newData[SCHEMA_VERSION_KEY] = anoriSchema.currentVersion;

  await browser.storage.local.set(newData);
  await browser.storage.local.remove([...keysToDelete]);

  // Clean up old OPFS directories after KV storage is persisted
  try {
    await opfsRoot.removeEntry("custom-icons", { recursive: true });
  } catch {
    // Directory doesn't exist, ignore
  }
  try {
    await opfsRoot.removeEntry("custom-themes", { recursive: true });
  } catch {
    // Directory doesn't exist, ignore
  }

  console.log(
    `[Storage] Migrated from legacy storage (v${allData.storageVersion ?? 0}) to schema v${anoriSchema.currentVersion}`,
  );
}

/**
 * Gets MIME type from filename for proper blob handling
 */
function getMimeFromFilename(filename: string): string {
  const name = filename.toLowerCase();
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
}
