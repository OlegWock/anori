# Storage System

The new storage system (`src/utils/storage-lib/` and `src/utils/storage`) provides schema-based, type-safe storage with HLC-based conflict resolution for cloud sync. It should be preferred over `browser.storage.local` unless there is specific need to work with raw storage.

## Core Concepts

* **Cells** — single values (e.g., `newTabTitle`)
* **Collections** — keyed records with entities (e.g., `folderDetails` with `Folder:{id}` keys)
* **StorageRecord** — internal wrapper with `hlc`, `value`, `deleted`, `brand`, `writerId`
* **HLC (Hybrid Logical Clock)** — timestamps for Last-Write-Wins conflict resolution

## Schema Definition

```ts
const schemaV1 = defineSchemaVersion(1, {
  myCell: cell({ key: "myCell", schema: z.string(), defaultValue: "", tracked: true }),
  myCollection: collection({
    keyPrefix: "MyItem",
    entities: { item: entity({ brand: "MyItem", schema: MyItemSchema }) },
    tracked: true,
  }),
});

const mySchema = defineVersionedSchema({ versions: [schemaV1], migrations: [] });
```

* `key`/`keyPrefix` are **required** — prevents accidental data loss on property rename
* `tracked: true` — adds changes to outbox for sync

## Using Storage

```ts
// Reading (synchronous - data cached in memory)
const value = storage.get(schema.myCell);
const item = storage.get(schema.myCollection.item.byId("id"));
const allItems = storage.get(schema.myCollection.item.all());

// Writing (async - persists to browser.storage.local)
await storage.set(schema.myCell, "new value");
await storage.set(schema.myCollection.item.byId("id"), { ... });
await storage.delete(schema.myCollection.item.byId("id"));

// Subscriptions
const unsubscribe = storage.subscribe(schema.myCell, (newVal, oldVal) => { ... });
```

## React Hooks

```ts
// Read-only
const [value, meta] = useStorageValue(schema.myCell);

// Read-write with optimistic updates
const [value, setValue, meta] = useStorageValue(schema.myCell);
await setValue("new value");
```

Hooks use **forked storage** internally — writes don't trigger the fork's own subscription (prevents echo).

## Storage Forks

Each `storage.fork()` creates a lightweight wrapper with its own ID:
* Writes tag records with `writerId`
* Change listener filters out events with matching `writerId`
* Prevents duplicate notifications from own writes

## File Storage

```ts
// Files are stored in OPFS with metadata in KV
await storage.files.set(schema.myFile, blob, { customProp: "value" });
const { blob, meta } = await storage.files.get(schema.myFile);
```

## Migrations

```ts
const migration = createMigration(schemaV1, schemaV2, async (ctx) => {
  const oldValue = ctx.from.get(schemaV1.definition.oldCell);
  ctx.to.set(schemaV2.definition.newCell, transform(oldValue));
});
```

* Each migration runs on an in-memory snapshot; its writes get fresh HLC timestamps, so migrated records sync like any other change
* Atomic **per migration step** — a step persists and bumps `__schema_version` only on full success; a failing step writes nothing (earlier steps in the path stay applied)
* Removed tracked keys get tombstones (untracked removed keys are deleted outright)

## Initialization

```ts
const storage = await getAnoriStorage();
```

## Sync Integration

```ts
storage.sync.getOutbox();           // Pending changes
storage.sync.exportForFullSync();   // All tracked data
storage.sync.exportOutbox();        // Only outbox entries
storage.sync.mergeRemoteChanges([...]); // Apply remote changes with LWW
```

## Schema Upgrades & Sync

Schema upgrades are gated at the **profile** level, not per cell. The profile carries a `profileSchemaVersion` (the schema version); bumping it is an atomic compare-and-swap on the profile, guarded by the commit-log sequence (`upgradeSchema` with `expectedSeq`), so only one client moves the epoch and a concurrent write can't be lost.

* **A migration is not authoritative over the cloud.** The first client whose local schema is newer than the profile becomes the *first-upgrader* (`upgradeProfileSchema`): it fetches the cloud head, migrates that snapshot in memory (`migrateSnapshot`), then **merges it with local data by HLC** (last-write-wins) and pushes the result via `upgradeSchema`. Lose the CAS race (a write landed, or another client upgraded first) → re-fetch & retry, or adopt the already-upgraded head (straggler).
* A client **behind** the profile epoch (local `currentVersion` < `profileSchemaVersion`, via `useIsBehindCloudSchema`) **pauses syncing** until it updates (the UI shows `cloud.syncPausedBehind`), so it never pushes stale-version data.
* **Transitional detail:** every cloud cell *also* still carries a per-cell `schemaVersion`, and pull / `mergeRemoteChanges` skip cells whose `schemaVersion` ≠ the local `currentVersion`. This per-cell column is **temporary** — kept during the protocol migration (per-cell schema → per-profile epoch) for rollback safety, and is slated for **removal once the per-profile epoch is fully rolled out**. Treat `profileSchemaVersion` as the source of truth.

For the full design — first-upgrader / straggler / lagging state machine, the phased rollout, and file handling — see `sync-schema-migration-design.md` in the workspace parent folder (one level above this repo).
