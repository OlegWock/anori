# Legacy Storage Migration Plan

This document outlines the complete migration from the legacy storage system to the new schema-based storage system.

---

## Background & Context

### Why This Migration?

Anori is migrating from a simple key-value storage wrapper to a new schema-based storage system that supports:
- **Cloud sync** with HLC (Hybrid Logical Clock) conflict resolution
- **Type-safe schemas** with Zod validation
- **Reactive hooks** for React components
- **File storage** integration (OPFS)
- **Migration system** for schema version changes

### Documentation References

- **New storage system rules:** `.cursor/rules/storage-and-sync.mdc` — comprehensive guide on using the new storage API
- **Implementation plan:** `STORAGE_IMPLEMENTATION_PLAN.md` — detailed technical design of the new system
- **Base project rules:** `.cursor/rules/base.mdc` — general project conventions

---

## Legacy System Overview

### Location of Legacy Code

| File | Purpose |
|------|---------|
| `src/utils/storage-legacy/api.ts` | Main legacy storage API (`storage.get`, `storage.set`, `useBrowserStorageValue`, `atomWithBrowserStorage`) |
| `src/utils/storage-legacy/migrations.ts` | Legacy migration runner and version tracking |
| `src/utils/namespaced-storage.ts` | `NamespacedStorage` class for plugin/widget storage |
| `src/utils/user-data/types.ts` | `StorageContent` type defining all stored keys |

### How Legacy Storage Works

1. **Direct `browser.storage.local` access** — thin wrapper around the browser API
2. **Jotai atoms** — `atomWithBrowserStorage()` creates reactive atoms that sync with storage
3. **`useBrowserStorageValue(key, default)`** — React hook for reading/writing storage
4. **`NamespacedStorage`** — stores objects under a single key (e.g., `WidgetStorage.{id}` contains all data for that widget)
5. **No schema validation** — values are stored as-is with TypeScript types only

### Legacy API Patterns to Replace

```ts
// OLD: useBrowserStorageValue hook
const [theme, setTheme] = useBrowserStorageValue("theme", "Greenery");

// OLD: Direct storage access
await storage.setOne("language", "en");
const lang = await storage.getOne("language");

// OLD: NamespacedStorage for widgets/plugins
const widgetStore = NamespacedStorage.get(`WidgetStorage.${instanceId}`);
widgetStore.set("someKey", value);
```

---

## New System Overview

### Location of New Code

| File | Purpose |
|------|---------|
| `src/utils/storage/` | Main storage module directory |
| `src/utils/storage/storage.ts` | Core `Storage` interface and `createStorage()` |
| `src/utils/storage/react.ts` | React hooks (`useStorageValue`, `useWritableStorageValue`) |
| `src/utils/storage/anori-schema.ts` | Anori's schema definition |
| `src/utils/storage/anori-init.ts` | Storage initialization and legacy migration |
| `src/utils/storage/schema/` | Schema primitives (`cell`, `collection`, `entity`, `file`) |

### Key Differences from Legacy

| Aspect | Legacy | New |
|--------|--------|-----|
| **Storage keys** | `Folder.home` (dot separator) | `Folder:home` (colon separator) |
| **Record format** | Raw values | `StorageRecord<T>` with `hlc`, `value`, `deleted`, `writerId` |
| **Validation** | TypeScript only | Zod runtime validation |
| **React hooks** | `useBrowserStorageValue(key, default)` | `useStorageValue(schema.cell)` / `useWritableStorageValue(schema.cell)` |
| **Dynamic keys** | `NamespacedStorage.get(key)` | `schema.collection.entity.byId(id)` |
| **Files** | Direct OPFS access | `storage.files` API with metadata tracking |
| **Sync support** | None | Outbox, HLC timestamps, merge API |

### New API Patterns

```ts
// NEW: useWritableStorageValue hook
const [theme, setTheme] = useWritableStorageValue(anoriSchema.theme);

// NEW: Direct storage access (after initialization)
const storage = getGlobalStorage();
await storage.set(anoriSchema.language, "en");
const lang = storage.get(anoriSchema.language); // Sync read!

// NEW: Collection access for widgets/plugins
const data = storage.get(anoriSchema.widgetStorage.storage.byId(instanceId));
await storage.set(anoriSchema.widgetStorage.storage.byId(instanceId), newData);
```

### Storage Initialization Flow

1. `initializeAnoriStorage()` is called in `start.tsx`
2. Checks if legacy storage exists (has `storageVersion` but no `__schema_version`)
3. If legacy: runs `migrateFromLegacy()` to convert all data
4. Creates `Storage` instance and sets it as global via `setGlobalStorage()`
5. Storage is now accessible via `getGlobalStorage()` and React hooks

---

## Current State

### Already Migrated
- `folders` — cell (array of folder metadata)
- `folderDetails` — collection (`Folder:{id}` keys)
- `newTabTitle` — cell

### Remaining to Migrate

---

## 1. Simple Cells (StorageContent Properties)

These are single-value settings stored directly in `browser.storage.local`.

| Key | Type | Default | Tracked | Used In |
|-----|------|---------|---------|---------|
| `theme` | `string` | `"Greenery"` | ✅ | `theme-hooks.ts`, `ThemesScreen.tsx` |
| `customThemes` | `CustomTheme[]` | `[]` | ✅ | `theme-hooks.ts`, `ThemesScreen.tsx` |
| `sidebarOrientation` | `"vertical" \| "horizontal" \| "auto"` | `"auto"` | ✅ | `start.tsx`, `Settings.tsx` |
| `autoHideSidebar` | `boolean` | `false` | ✅ | `Sidebar.tsx`, `Settings.tsx` |
| `showBookmarksBar` | `boolean` | `false` | ✅ | `start.tsx`, `Settings.tsx` |
| `rememberLastFolder` | `boolean` | `false` | ✅ | `start.tsx`, `Settings.tsx` |
| `lastFolder` | `string \| undefined` | `"home"` | ❌ | `start.tsx`, `Settings.tsx` |
| `compactMode` | `boolean` | device-dependent | ✅ | `compact.tsx`, `Settings.tsx` |
| `automaticCompactMode` | `boolean` | device-dependent | ✅ | `compact.tsx`, `Settings.tsx` |
| `automaticCompactModeThreshold` | `number` | `1500` | ✅ | `compact.tsx`, `Settings.tsx` |
| `showLoadAnimation` | `boolean` | `false` | ✅ | `start.tsx`, `Settings.tsx` |
| `language` | `Language` | `"en"` | ✅ | `start.tsx`, `Settings.tsx`, `Onboarding.tsx`, `translations/index.ts`, `background.ts` |
| `hasUnreadReleaseNotes` | `boolean` | `false` | ❌ | `Sidebar.tsx`, `background.ts` |
| `finishedOnboarding` | `boolean` | `false` | ❌ | `Onboarding.tsx` |
| `userId` | `string` | generated | ❌ | `analytics.ts` |
| `analyticsEnabled` | `boolean` | `false` | ❌ | `analytics.ts`, `Settings.tsx` |
| `analyticsLastSend` | `number` | `0` | ❌ | `analytics.ts` |
| `dailyUsageMetrics` | `Record<string, number>` | `{}` | ❌ | `analytics.ts` |
| `performanceAvgLcp` | `{ avg, n }` | `{ avg: 0, n: 0 }` | ❌ | `analytics.ts` |
| `performanceRawInp` | `number[]` | `[]` | ❌ | `analytics.ts` |
| `cloudAccount` | `{ sessionToken, email, userId } \| null` | `null` | ❌ | `cloud-integration/storage.ts` |
| `storageVersion` | `number` | `0` | ❌ | Legacy only, not migrated |

---

## 2. Collections (Dynamic Keys)

### 2.1 Plugin Configuration
**Pattern:** `PluginConfig.{pluginId}`  
**Used in:** `src/utils/plugins/config.ts`

```ts
pluginConfig: collection({
  keyPrefix: "PluginConfig",
  entities: {
    config: entity({ brand: "PluginConfig", schema: z.record(z.string(), z.unknown()) }),
  },
  tracked: true,
}),
```

### 2.2 Widget Storage
**Pattern:** `WidgetStorage.{instanceId}`  
**Used in:** `src/utils/plugins/storage.ts`, multiple plugins

Each widget instance can store arbitrary data. Used by:
- `weather` plugin — cached weather data
- `rss` plugin — feed cache
- `tasks` plugin — task list
- `bookmark` plugin — resolved icons/favicons
- `notes` plugin — note content
- `top-sites` plugin — cached sites

```ts
widgetStorage: collection({
  keyPrefix: "WidgetStorage",
  entities: {
    storage: entity({ brand: "WidgetStorage", schema: z.record(z.string(), z.unknown()) }),
  },
  tracked: true,
}),
```

### 2.3 Plugin Storage
**Pattern:** `PluginStorage.{pluginId}`  
**Used in:** `src/utils/plugins/storage.ts`

Plugin-wide storage (not per-widget). Currently unused but API exists.

```ts
pluginStorage: collection({
  keyPrefix: "PluginStorage",
  entities: {
    storage: entity({ brand: "PluginStorage", schema: z.record(z.string(), z.unknown()) }),
  },
  tracked: true,
}),
```

---

## 3. Files (OPFS)

### 3.1 Custom Icons
**Location:** `custom-icons/` directory in OPFS  
**Used in:** `src/components/icon/custom-icons.ts`

User-uploaded icon files (SVG, PNG, etc.) for folder icons.

```ts
customIcons: fileCollection({
  keyPrefix: "CustomIcon",
  tracked: true,
  propertiesSchema: z.object({
    name: z.string(),
    mimeType: z.string().optional(),
  }),
}),
```

### 3.2 Custom Theme Backgrounds
**Location:** `custom-themes/` directory in OPFS  
**Used in:** `src/utils/user-data/theme.ts`

Two files per theme:
- `{themeName}-original` — original uploaded image
- `{themeName}-blurred` — blurred version for background

```ts
customThemeBackgrounds: fileCollection({
  keyPrefix: "ThemeBackground",
  tracked: true,
  propertiesSchema: z.object({
    themeName: z.string(),
    variant: z.enum(["original", "blurred"]),
  }),
}),
```

---

## 4. Implementation Plan

### Phase 1: Schema Extension

1. **Extend `anori-schema.ts`** with all cells and collections
2. **Add Zod schemas** for complex types (`CustomTheme`, analytics types, etc.)
3. **Define tracked vs untracked** — sync-relevant data should be tracked

### Phase 2: Update Legacy Migration

1. **Update `anori-init.ts`** to migrate all `StorageContent` keys
2. **Migrate dynamic keys:**
   - `PluginConfig.*` → `PluginConfig:*`
   - `WidgetStorage.*` → `WidgetStorage:*`
   - `PluginStorage.*` → `PluginStorage:*`
3. **Handle key format change:** Legacy uses `.` separator, new system uses `:`

### Phase 3: Update Consumers (by file)

#### `src/utils/user-data/theme-hooks.ts`
- [ ] Replace `useBrowserStorageValue("theme", ...)` with `useWritableStorageValue(anoriSchema...theme)`
- [ ] Replace `useBrowserStorageValue("customThemes", ...)` with `useWritableStorageValue(anoriSchema...customThemes)`

#### `src/pages/newtab/start.tsx`
- [ ] Replace all `useBrowserStorageValue` calls
- [ ] Replace `storage.getOne("showBookmarksBar")` with new API
- [ ] Replace `storage.getOne("showLoadAnimation")` with new API

#### `src/pages/newtab/settings/Settings.tsx`
- [ ] Replace all 12+ `useBrowserStorageValue` calls with new hooks
- [ ] Update export/import logic for backup (lines 487-529):
  - Export: Uses `browser.storage.local.get(null)` and zips OPFS files
  - Import: Uses `browser.storage.local.clear()` and `browser.storage.local.set()`
  - Need to adapt to new storage record format and file storage structure

#### `src/pages/newtab/settings/ThemesScreen.tsx`
- [ ] Replace `useBrowserStorageValue` calls
- [ ] Replace `storage.getOne/setOne` calls

#### `src/pages/newtab/components/Sidebar.tsx`
- [ ] Replace `useBrowserStorageValue` calls

#### `src/components/Onboarding.tsx`
- [ ] Replace `useBrowserStorageValue("language", ...)`
- [ ] Replace `storage.getOne/setOne("finishedOnboarding")`

#### `src/utils/compact.tsx`
- [ ] Replace 3 `useBrowserStorageValue` calls

#### `src/translations/index.ts`
- [ ] Replace `storage.getOne("language")` — this runs early, need sync access

#### `src/utils/analytics.ts`
- [ ] Replace all `storage.get/getOne/set/setOne` calls
- [ ] Replace `analyticsEnabledAtom` with new storage atom

#### `src/background.ts`
- [ ] Replace `storage.setOne("hasUnreadReleaseNotes", ...)`
- [ ] Replace `storage.setOne("language", ...)`

#### `src/utils/plugins/config.ts`
- [ ] Replace `atomWithBrowserStorage` with new collection access
- [ ] Update `getPluginConfig` and `usePluginConfig`

#### `src/utils/plugins/storage.ts`
- [ ] Replace `NamespacedStorage.get(...)` with new collection access
- [ ] Update `getWidgetStorage`, `useWidgetStorage`, `getPluginStorage`, `usePluginStorage`

#### `src/utils/namespaced-storage.ts`
- [ ] Deprecate or remove after all consumers migrated

#### `src/utils/plugins/widget.ts`
- [ ] Update `getAllWidgetsByPlugin` to use new storage API
- [ ] Currently uses legacy `Folder.{id}` pattern directly with `browser.storage.local`

#### `src/cloud-integration/storage.ts`
- [ ] Replace `atomWithBrowserStorageStatic("cloudAccount", ...)` with new API

#### Plugin files
Each plugin using `useWidgetStorage` needs verification that it works with new API:
- [ ] `src/plugins/weather/weather-plugin.tsx`
- [ ] `src/plugins/rss/rss-plugin.tsx` and `utils.ts`
- [ ] `src/plugins/tasks/tasks-plugin.tsx`
- [ ] `src/plugins/bookmark/bookmark-plugin.tsx`
- [ ] `src/plugins/notes/notes-plugin.tsx`
- [ ] `src/plugins/top-sites/top-sites-plugin.tsx`

### Phase 4: File Storage Migration

1. **Add file collections to schema**
2. **Create migration for existing OPFS files:**
   - Enumerate `custom-icons/` directory
   - Create metadata records in new storage
   - Move files to new OPFS structure (`__storage__/` folder)
3. **Same for `custom-themes/` directory**
4. **Update consumers:**
   - `src/components/icon/custom-icons.ts` — use `storage.files` API
   - `src/utils/user-data/theme.ts` — use `storage.files` API

### Phase 5: Cleanup

1. **Remove legacy storage code:**
   - `src/utils/storage-legacy/api.ts`
   - `src/utils/storage-legacy/migrations.ts`
   - `src/utils/namespaced-storage.ts`
2. **Remove old type definitions** from `src/utils/user-data/types.ts` (keep `Folder`, `WidgetInFolder`, etc. that are still used)
3. **Update exports** in `src/utils/storage/index.ts`

---

## 5. Migration Order (Recommended)

1. **Low-risk cells first** — settings that are simple booleans/strings
2. **Theme system** — `theme`, `customThemes`, and theme backgrounds
3. **Analytics/internal** — non-user-facing data
4. **Plugin/widget storage** — most complex, affects all plugins
5. **Custom icons** — file storage with UI implications
6. **Final cleanup** — remove legacy code

---

## 6. Testing Checklist

- [ ] Fresh install works correctly
- [ ] Upgrade from legacy storage migrates all data
- [ ] All settings persist across browser restarts
- [ ] Custom themes load correctly
- [ ] Custom icons display correctly
- [ ] Each plugin's widget storage works
- [ ] Export/import backup functionality works
- [ ] Background script storage access works
- [ ] Analytics data collection works (if enabled)
- [ ] Cloud sync integration works (if implemented)

---

## 7. Breaking Changes & Considerations

### Storage Key Format
Legacy: `Folder.home`, `WidgetStorage.abc123`  
New: `Folder:home`, `WidgetStorage:abc123`

Migration must handle this transformation.

### Early Access in `translations/index.ts`
`initTranslation()` reads language before React mounts. Need to ensure storage is initialized by then, or use a different pattern.

### Background Script
Background script uses `storage.setOne()` directly. Need to initialize new storage in background context too right before the write

### Backup Export/Import
Current backup relies on old storage system. It will needs to be reworked and won't be backward compatible. This is out of scope for now.

### Atoms Outside React
`analyticsEnabledAtom` and `cloudAccountAtom` are used outside React context. New storage atoms use Jotai with `onMount`, need to verify this works.

### Session Storage
`browser.storage.session` is used in `background.ts` for `scheduledCallbacksInfo`. This is ephemeral session data and **should not be migrated** to the new storage system.

### Direct browser.storage.local Access
Some files access `browser.storage.local` directly:
- `src/utils/plugins/widget.ts` — `getAllWidgetsByPlugin()` uses legacy key pattern
- `src/utils/namespaced-storage.ts` — `clear()` method

These need special handling during migration.

---

## 8. Migration Code Examples

### Adding a New Cell to Schema

In `src/utils/storage/anori-schema.ts`:

```ts
export const schemaV1 = defineSchemaVersion(1, {
  // ... existing cells ...
  
  // Add new cell
  theme: cell({
    key: "theme",
    schema: z.string(),
    defaultValue: "Greenery",
    tracked: true,  // Set true if should sync to cloud
  }),
});
```

### Adding a New Collection to Schema

```ts
export const schemaV1 = defineSchemaVersion(1, {
  // ... existing ...
  
  widgetStorage: collection({
    keyPrefix: "WidgetStorage",
    entities: {
      storage: entity({
        brand: "WidgetStorage",
        schema: z.record(z.string(), z.unknown()),
      }),
    },
    tracked: true,
  }),
});
```

### Migrating Legacy Data in `anori-init.ts`

In `migrateFromLegacy()`:

```ts
// Simple cell migration
if (allData.theme !== undefined) {
  newData["theme"] = wrapValue(allData.theme, hlc.tick());
}

// Collection migration (with key format change)
for (const key of Object.keys(allData)) {
  if (key.startsWith("WidgetStorage.")) {
    const id = key.slice("WidgetStorage.".length);
    const newKey = `WidgetStorage:${id}`;  // Note: colon, not dot
    newData[newKey] = wrapValue(allData[key], hlc.tick(), "WidgetStorage");
  }
}
```

### Replacing `useBrowserStorageValue` in Components

```ts
// BEFORE
import { useBrowserStorageValue } from "@anori/utils/storage-legacy/api";
const [theme, setTheme] = useBrowserStorageValue("theme", "Greenery");

// AFTER
import { anoriSchema, useWritableStorageValue } from "@anori/utils/storage";
const [theme, setTheme] = useWritableStorageValue(
  anoriSchema.theme
);
```

### Replacing `storage.getOne/setOne` Calls

```ts
// BEFORE
import { storage } from "@anori/utils/storage-legacy/api";
const lang = await storage.getOne("language");
await storage.setOne("language", "en");

// AFTER
import { anoriSchema, getGlobalStorage } from "@anori/utils/storage";
const storage = getGlobalStorage();
const lang = storage.get(anoriSchema.language);  // Sync!
await storage.set(anoriSchema.language, "en");
```

### Replacing `NamespacedStorage` for Widgets

```ts
// BEFORE
import { NamespacedStorage } from "@anori/utils/namespaced-storage";
const store = NamespacedStorage.get<MyStorageType>(`WidgetStorage.${instanceId}`);
const value = store.get("someKey");
store.set("someKey", newValue);

// AFTER
import { anoriSchema, getGlobalStorage } from "@anori/utils/storage";
const storage = getGlobalStorage();
const query = anoriSchema.widgetStorage.storage.byId(instanceId);
const allData = storage.get(query) ?? {};
const value = allData.someKey;
await storage.set(query, { ...allData, someKey: newValue });
```

### Replacing `useWidgetStorage` Hook

The existing `useWidgetStorage` in `src/utils/plugins/storage.ts` needs to be reimplemented to use the new storage system. The new implementation should:

1. Use `useWritableStorageValue` with the widget storage collection
2. Provide the same API surface to minimize plugin changes
3. Handle the `useValue()` method that plugins rely on

---

## 9. Verification Steps

After migrating each component:

1. **TypeScript check:** `pnpm typecheck`
2. **Lint:** `pnpm lint`
3. **Test:** `pnpm vitest run`
4. **Manual testing:**
   - Fresh install (no existing data)
   - Upgrade from legacy (existing data should migrate)
   - Settings persist after browser restart
   - Changes sync between tabs (if applicable)
