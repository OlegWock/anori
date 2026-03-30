# Backlog

## Code Cleanup

### Dangling records on full sync

In `src/cloud-integration/sync-manager.ts`, full sync from remote never deletes local cells that are absent on the remote side. This means if something is deleted remotely, the local copy persists as stale data. Could cause ghost data to accumulate over time.

### `alert()` used for user-facing errors

`src/pages/newtab/settings/Settings.tsx` uses the browser's native `alert()` to tell users about invalid custom icon format. There's no toast/notification system in the app, so this was the path of least resistance, but it's jarring UX. Needs either a toast system or at minimum an inline error message.

### Custom background images are uncompressed

In `src/pages/newtab/settings/ThemesScreen.tsx`, custom background images are stored as PNG blobs, which can be quite large. Switching to WebP with compression would reduce storage usage significantly, but needs a migration strategy for existing users who already have PNG backgrounds saved.

### Biome file-level ignore

`src/declarations.d.ts` has per-line `biome-ignore` comments for default exports. Waiting for Biome 2 which supports file-level ignores. Minor cleanup, no functional impact.

