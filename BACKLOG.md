# Backlog

## Code Cleanup

### `clearWidgetStorage` hardcoded list

In `src/utils/scoped-store.ts`, `clearWidgetStorage()` has a manually maintained list of every widget store collection. Adding a new widget store means remembering to update this function, and forgetting means dangling data. The code already has a TODO acknowledging this. Needs some kind of registration mechanism so widget stores are automatically cleaned up.

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
