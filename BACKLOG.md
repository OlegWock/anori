# Backlog

## Code Cleanup

### Dangling records on full sync

In `src/cloud-integration/sync-manager.ts`, full sync from remote never deletes local cells that are absent on the remote side. This means if something is deleted remotely, the local copy persists as stale data. Could cause ghost data to accumulate over time.

### `alert()` used for user-facing errors

`src/pages/newtab/settings/Settings.tsx` uses the browser's native `alert()` to tell users about invalid custom icon format. There's no toast/notification system in the app, so this was the path of least resistance, but it's jarring UX. Needs either a toast system or at minimum an inline error message.

### Custom background images are uncompressed

In `src/pages/newtab/settings/ThemesScreen.tsx`, custom background images are stored as PNG blobs, which can be quite large. Switching to WebP with compression would reduce storage usage significantly, but needs a migration strategy for existing users who already have PNG backgrounds saved.

### Outbox race condition on parallel writes

In `src/utils/storage-lib/storage.ts`, `addToOutbox` does a read-modify-write on the shared outbox array. When multiple tracked writes run in parallel (e.g. `Promise.all` of deletes in `clearWidgetStorage`), each call reads the same outbox snapshot, appends its entry, and persists — later writes overwrite earlier ones, losing outbox entries. This means some changes may not sync to the cloud. The record writes themselves are safe (different keys), only outbox bookkeeping is affected.

### Batch `browser.storage.local.set` calls

In `src/utils/storage-lib/storage.ts`, every `setInternal`/`deleteInternal` call immediately writes to `browser.storage.local.set` for the record key, then again for HLC state, and potentially again for the outbox. When multiple storage operations happen in the same tick (e.g. parallel deletes), this results in many redundant writes for shared keys like HLC state and outbox. These writes should be deferred to the next microtick so that all changes within a synchronous batch are coalesced into a single `browser.storage.local.set` call per key.

### Biome file-level ignore

`src/declarations.d.ts` has per-line `biome-ignore` comments for default exports. Waiting for Biome 2 which supports file-level ignores. Minor cleanup, no functional impact.

