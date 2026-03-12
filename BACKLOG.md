# Backlog

## Split Large Files

### `Settings.tsx` (745 lines)

Contains 8 distinct screen components (General, CustomIcons, Folders, Plugins, ImportExport, Themes, HelpAbout) plus the modal wrapper, all in one file. Each screen is self-contained with its own state and has no reason to live alongside the others. ThemesScreen was already extracted to its own file, which proves the pattern works.

### `Onboarding.tsx` (424 lines)

Same issue as Settings -- multiple step screens (start, folders, customization, analytics, presets) in a single file. Each step is independent.

### `WhatsNew.tsx` (450 lines)

Release notes component that grows with every release. Contains entries going back to the beginning. Old entries will never be seen by users who update regularly. The file will only get bigger over time.


## Code Cleanup

### `clearWidgetStorage` hardcoded list

In `src/utils/scoped-store.ts`, `clearWidgetStorage()` has a manually maintained list of every widget store collection. Adding a new widget store means remembering to update this function, and forgetting means dangling data. The code already has a TODO acknowledging this. Needs some kind of registration mechanism so widget stores are automatically cleaned up.

### `lazy-components.tsx` hierarchy violation

`src/components/lazy-components.tsx` imports from `src/pages/newtab/` (SettingsModal, NewWidgetWizard), which means a shared module depends on page-specific code. This breaks the dependency hierarchy and the file itself has a TODO about it. The page-specific lazy loaders should live closer to the page that uses them.

### Dangling records on full sync

In `src/cloud-integration/sync-manager.ts`, full sync from remote never deletes local cells that are absent on the remote side. This means if something is deleted remotely, the local copy persists as stale data. Could cause ghost data to accumulate over time.

### `alert()` used for user-facing errors

`src/pages/newtab/settings/Settings.tsx` uses the browser's native `alert()` to tell users about invalid custom icon format. There's no toast/notification system in the app, so this was the path of least resistance, but it's jarring UX. Needs either a toast system or at minimum an inline error message.

### Custom icons not preloaded early enough

In `src/pages/newtab/start.tsx`, custom icons aren't preloaded during initialization, so they can flash or pop in after the page renders. The TODO is right next to where other preloading happens (bookmarks bar, lazy components) -- just needs the custom icon preload added to the same flow.

### Custom background images are uncompressed

In `src/pages/newtab/settings/ThemesScreen.tsx`, custom background images are stored as PNG blobs, which can be quite large. Switching to WebP with compression would reduce storage usage significantly, but needs a migration strategy for existing users who already have PNG backgrounds saved.

### Plugin config screen type assertion

In `src/pages/newtab/settings/Settings.tsx`, the plugin configuration screen component uses a raw type assertion (`as ComponentType<...>`) instead of a proper type guard. Works but bypasses type safety at a boundary where a runtime check would be more robust.

### Biome file-level ignore

`src/declarations.d.ts` has per-line `biome-ignore` comments for default exports. Waiting for Biome 2 which supports file-level ignores. Minor cleanup, no functional impact.

### i18n reactive dependency pattern repeated 7 times

Multiple plugins (`recently-closed`, `rss`, `calendar`, `datetime`, `bookmark`) use the same pattern: `useMemo` with `i18n.language` in the dependency array as a reactive proxy for locale changes affecting moment.js formatting. The dependency is non-obvious and the pattern is copy-pasted across files. Additionally, `datetime-plugin.tsx` notes that moment.js should be migrated to dayjs, which would be a good time to clean up this pattern.
