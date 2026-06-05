# Backlog

## Code Cleanup

### `alert()` used for user-facing errors

`src/pages/newtab/settings/Settings.tsx` uses the browser's native `alert()` to tell users about invalid custom icon format. There's no toast/notification system in the app, so this was the path of least resistance, but it's jarring UX. Needs either a toast system or at minimum an inline error message.

### Custom background images are uncompressed

In `src/pages/newtab/settings/ThemesScreen.tsx`, custom background images are stored as PNG blobs, which can be quite large. Switching to WebP with compression would reduce storage usage significantly, but needs a migration strategy for existing users who already have PNG backgrounds saved.
