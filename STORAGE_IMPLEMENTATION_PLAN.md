# Storage Layer Implementation Plan

This document outlines the implementation plan for the new storage layer in Anori, designed to support cloud sync with HLC-based conflict resolution.

## Overview

The new storage layer replaces the current thin wrapper around `chrome.storage` with a schema-based, type-safe storage system that:

- Tracks changes with Hybrid Logical Clocks (HLC)
- Provides runtime validation via Zod
- Supports migrations between schema versions
- Exposes a reactive API via React hooks
- Handles both KV and file storage
- Integrates with sync (outbox, merge)

---

## Phase 1: Foundation

### 1.1 Add Zod Dependency

**File:** `package.json`

```bash
pnpm add zod
```

Zod provides:
- Runtime schema validation
- Type inference from schemas
- Composable schema definitions

---

### 1.2 HLC Implementation

**Location:** `src/utils/storage/hlc.ts`

Implement Hybrid Logical Clock for ordering writes.

```ts
type HlcTimestamp = {
  pt: number;   // Physical time (ms since epoch)
  lc: number;   // Logical counter
  node: string; // Unique node identifier
};
```

**Functions to implement:**

| Function | Description |
|----------|-------------|
| `createHlc()` | Create new HLC instance with generated node ID |
| `tick(hlc)` | Advance HLC on local write, returns new timestamp |
| `receive(hlc, remote)` | Update local HLC after receiving remote timestamp |
| `compare(a, b)` | Compare two HLC timestamps (-1, 0, 1) |
| `isNewer(a, b)` | Returns true if `a` is newer than `b` |
| `serialize(ts)` / `deserialize(str)` | String serialization |

**Implementation notes:**
- Node ID should be generated once and persisted in `browser.storage.local`
- Use `Date.now()` for physical time
- Handle clock drift (when local time goes backward)

---

### 1.3 Storage Record Types

**Location:** `src/utils/storage/types.ts`

Define internal record structure:

```ts
type StorageRecord<T> = {
  brand?: string;           // Entity type for mixed collections
  hlc: HlcTimestamp;        // Last write timestamp
  deleted?: boolean;        // Tombstone flag
  value: T;                 // Actual value
};

type FileMetaRecord = {
  hlc: HlcTimestamp;
  deleted?: boolean;
  properties?: unknown;     // User-defined file properties
  path: string;             // Path in OPFS
};
```

---

## Phase 2: Schema Definition

### 2.1 Cell Definition

**Location:** `src/utils/storage/schema/cell.ts`

```ts
type CellOptions<T> = {
  key?: string;             // Storage key (defaults to schema property name)
  schema: z.ZodType<T>;     // Zod schema for validation
  defaultValue?: T;         // Optional default
  tracked: boolean;         // Whether to track in outbox for sync
};

function cell<T>(options: CellOptions<T>): CellDescriptor<T>;
```

**CellDescriptor interface:**
- Holds schema configuration (key, schema, default, tracked)
- Acts as a query object passed to `storage.get()` / `storage.set()`
- Provides type inference for values

---

### 2.2 Collection Entity

**Location:** `src/utils/storage/schema/entity.ts`

```ts
type EntityOptions<T> = {
  brand: string;            // Discriminator for mixed collections
  schema: z.ZodType<T>;     // Zod schema
};

function entity<T>(options: EntityOptions<T>): EntityDescriptor<T>;
```

---

### 2.3 Collection Definition

**Location:** `src/utils/storage/schema/collection.ts`

```ts
type CollectionOptions<E extends Record<string, EntityDescriptor>> = {
  keyPrefix?: string;       // Key prefix (defaults to schema property name)
  entities: E;              // Entity descriptors
  tracked: boolean;         // Track for sync
};

function collection<E>(options: CollectionOptions<E>): CollectionDescriptor<E>;
```

**CollectionDescriptor interface:**
- `.all()` — query all items
- `.byId(id)` — query single item by ID
- `.[entityName].all()` — query all items of entity type
- `.[entityName].byId(id)` — query single item of entity type by ID

---

### 2.4 Schema Version Definition

**Location:** `src/utils/storage/schema/version.ts`

```ts
function defineSchemaVersion<V extends number, S extends SchemaDefinition>(
  version: V,
  schema: S
): SchemaVersion<V, S>;
```

Returns object with:
- `version: V`
- `definition: S`
- Accessors for each schema property

---

### 2.5 Versioned Schema Container

**Location:** `src/utils/storage/schema/versioned.ts`

```ts
type Migration<From, To> = {
  from: SchemaVersion<number, From>;
  to: SchemaVersion<number, To>;
  migrate: (ctx: MigrationContext<From, To>) => Promise<void>;
};

function migrate<From, To>(
  from: SchemaVersion<number, From>,
  to: SchemaVersion<number, To>,
  fn: MigrationFn<From, To>
): Migration<From, To>;

function defineVersionedSchema<V extends SchemaVersion[]>(options: {
  versions: V;
  migrations: Migration[];
}): VersionedSchema;
```

---

## Phase 3: Core Storage Engine

### 3.1 Storage Instance

**Location:** `src/utils/storage/storage.ts`

```ts
type CreateStorageOptions = {
  schema: VersionedSchema;
  filesSchema?: FilesSchema;  // Optional file schema
};

function createStorage(options: CreateStorageOptions): Storage;
```

Always uses `browser.storage.local` internally.

**Storage interface:**

| Method | Description |
|--------|-------------|
| `schema` | Access schema descriptors |
| `get(query)` | Get single cell or collection query |
| `get({ ... })` | Get multiple values at once |
| `set(query, value)` | Set cell or collection item |
| `delete(query)` | Soft-delete (tombstone) |
| `subscribe(query, callback)` | Subscribe to changes |
| `files` | File storage API (Phase 4) |

---

### 3.2 Query Resolution

**Location:** `src/utils/storage/query.ts`

Convert schema queries to storage keys:

| Query Type | Storage Key Pattern |
|------------|---------------------|
| `schema.cell` | `{key}` |
| `schema.collection.all()` | Prefix scan: `{keyPrefix}:*` |
| `schema.collection.byId(id)` | `{keyPrefix}:{id}` |
| `schema.collection.entity.all()` | Prefix scan + brand filter |
| `schema.collection.entity.byId(id)` | `{keyPrefix}:{id}` (with brand validation) |

---

### 3.3 Read Operations

**Location:** `src/utils/storage/operations/read.ts`

1. Resolve query to storage key(s)
2. Fetch from `browser.storage.local`
3. Unwrap `StorageRecord` to get value
4. Validate against schema
5. Handle missing values (return `undefined` or default)
6. Filter tombstoned records for collection queries

---

### 3.4 Write Operations

**Location:** `src/utils/storage/operations/write.ts`

1. Resolve query to storage key
2. Validate value against schema
3. Tick HLC to get new timestamp
4. Wrap value in `StorageRecord`
5. Write to `browser.storage.local`
6. If tracked, add key to outbox
7. Emit change event

---

### 3.5 Delete Operations

**Location:** `src/utils/storage/operations/delete.ts`

Soft-delete via tombstone:
1. Set `deleted: true` on record
2. Set `value: null` to save storage space
3. Update HLC
4. Add to outbox if tracked

---

### 3.6 Change Detection & Events

**Location:** `src/utils/storage/events.ts`

- Listen to `browser.storage.local.onChanged`
- Parse changed keys, identify which queries are affected
- Emit typed events to subscribers
- Provide `subscribe(query, callback)` API

---

## Phase 4: Files Storage

### 4.1 File Schema Definition

**Location:** `src/utils/storage/schema/file.ts`

```ts
type FileOptions<P> = {
  key?: string;
  tracked: boolean;
  propertiesSchema?: z.ZodType<P>;
};

function file<P>(options: FileOptions<P>): FileDescriptor<P>;

type FileCollectionOptions<P> = {
  keyPrefix?: string;
  tracked: boolean;
  propertiesSchema?: z.ZodType<P>;
};

function fileCollection<P>(options: FileCollectionOptions<P>): FileCollectionDescriptor<P>;
```

---

### 4.2 Files Storage API

**Location:** `src/utils/storage/files.ts`

| Method | Description |
|--------|-------------|
| `get(query)` | Get metadata + blob |
| `getMeta(query)` | Get metadata only |
| `getBlob(path)` | Get blob by OPFS path |
| `set(query, blob, properties)` | Set blob + properties |
| `updateBlob(query, blob)` | Update blob only (must exist) |
| `updateProperties(query, props)` | Update properties only |
| `delete(query)` | Soft-delete file |

**Implementation notes:**
- File metadata stored in KV with `__file:` prefix
- Actual blobs stored in OPFS with random names
- On delete: tombstone metadata, optionally delete OPFS file
- Use KV change events for file change notifications

---

### 4.3 OPFS Helpers

**Location:** `src/utils/storage/opfs.ts`

Extend existing `src/utils/opfs.ts`:

| Function | Description |
|----------|-------------|
| `writeFile(path, blob)` | Write blob to OPFS |
| `readFile(path)` | Read blob from OPFS |
| `deleteFile(path)` | Delete file from OPFS |
| `generatePath()` | Generate random file path |
| `listFiles(prefix)` | List files (for cleanup) |

---

## Phase 5: Reactive API

### 5.1 React Hooks

**Location:** `src/utils/storage/react.ts`

```ts
function useStorageValue<T>(query: Query<T>): [
  value: T | undefined,
  meta: { isLoading: boolean; usingDefault: boolean }
];

function useStorageMutation<T>(query: Query<T>): {
  set: (value: T) => Promise<void>;
  delete: () => Promise<void>;
  isPending: boolean;
};
```

**Implementation:**
- Use Jotai atoms internally for reactivity
- Subscribe to storage changes
- Handle loading states
- Memoize query resolution

Storage is a singleton — no context needed. Hooks import the global instance directly.

---

## Phase 6: Sync Integration

Sync methods live on the storage instance under `storage.sync.*` namespace.

**Location:** `src/utils/storage/sync/` (implementation files)

### 6.1 Outbox

Track pending changes for sync:

```ts
type OutboxEntry = {
  key: string;
  type: 'kv' | 'file';
  hlc: HlcTimestamp;
  addedAt: number;
};
```

| Method | Description |
|--------|-------------|
| `storage.sync.getOutbox()` | Get all pending entries |
| `storage.sync.removeFromOutbox(keys)` | Remove after successful sync |
| `storage.sync.clearOutbox()` | Clear all (after full sync) |

Adding to outbox happens internally during write/delete operations. Keys are **deduplicated** — if a key already exists in outbox, it's updated (new HLC, new timestamp) rather than added again.

Outbox stored in `browser.storage.local` under reserved key.

---

### 6.2 Merge Remote Changes

Apply incoming changes from server:

```ts
type RemoteChange = {
  key: string;
  value: unknown;
  hlc: HlcTimestamp;
  sv: number;  // Schema version
  deleted?: boolean;
};

storage.sync.mergeRemoteChanges(changes: RemoteChange[]): Promise<MergeResult>;
```

**Merge logic:**
1. For each remote change:
   - Compare `sv` — skip if remote sv > current schema version
   - Compare HLC with local record
   - If remote wins → apply change
   - If local wins → keep local, skip
2. Update local HLC with most recent remote timestamp
3. Return list of applied/skipped changes

---

### 6.3 Export for Sync

Prepare data for sync endpoints:

```ts
storage.sync.exportForFullSync(): Promise<ExportData>;
storage.sync.exportOutbox(): Promise<OutboxExport>;
```

---

## Phase 7: Migration System

### 7.1 Migration Runner

**Location:** `src/utils/storage/migrations/runner.ts`

```ts
async function runMigrations(storage: Storage): Promise<void>;
```

1. Read current schema version from storage
2. Find applicable migrations
3. Load entire storage into memory
4. For each migration:
   - Create `from` accessor (reads from in-memory snapshot)
   - Create `to` accessor (writes to in-memory target)
   - Execute migration function against in-memory objects
   - On success: persist entire result to storage, update schema version
   - On failure: discard in-memory changes, abort (no partial writes)
5. Clean up old keys if needed

**Key principle:** Migration operates on in-memory copy. Only persists when migration fully succeeds. This prevents half-broken state in storage.

---

### 7.2 Migration Context

**Location:** `src/utils/storage/migrations/context.ts`

Provide migration function with:
- `from.get()` / `from.schema` — read from in-memory snapshot of old data
- `to.set()` / `to.schema` — write to in-memory target object
- All changes buffered until migration completes successfully

---

## Phase 8: Testing

No testing infrastructure exists yet — need to set it up as part of implementation.

### 8.1 Testing Setup

**Location:** project root config + `src/utils/storage/__tests__/`

- Add modern test runner (Vitest recommended — fast, ESM-native, compatible with rspack)
- Configure for TypeScript
- Add npm scripts: `pnpm test`, `pnpm test:watch`

### 8.2 Unit Tests

| Test File | Coverage |
|-----------|----------|
| `hlc.test.ts` | HLC operations, comparison, serialization |
| `schema.test.ts` | Schema definition, query resolution |
| `storage.test.ts` | Read/write operations, validation |
| `files.test.ts` | File storage operations |
| `merge.test.ts` | Conflict resolution, LWW |
| `migrations.test.ts` | Migration runner |

### 8.3 Test Utilities

**Location:** `src/utils/storage/__tests__/utils.ts`

- Mock `browser.storage.local`
- Mock OPFS
- Test storage factory
- HLC test helpers

---

## Phase 9: Integration

### 9.1 Define Anori Schema

**Location:** `src/utils/storage/anori-schema.ts`

Migrate current `StorageContent` type to new schema:

```ts
const v1 = defineSchemaVersion(1, {
  theme: cell({ schema: z.string(), defaultValue: 'auto', tracked: true }),
  folders: cell({ schema: FoldersSchema, defaultValue: [], tracked: true }),
  folderDetails: collection({
    entities: {
      folder: entity({ brand: 'FolderDetails', schema: FolderDetailsSchema }),
    },
    tracked: true,
  }),
  widgetStorage: collection({
    entities: { ... },
    tracked: true,
  }),
  pluginStorage: collection({
    entities: { ... },
    tracked: true,
  }),
  // ... other cells
});
```

---

### 9.2 Initialize Storage

**Location:** `src/utils/storage/init.ts`

```ts
export const storage = createStorage({
  schema: anoriSchema,
  filesSchema: anoriFilesSchema,
});

export async function initializeStorage(): Promise<void> {
  await storage.initialize();  // Run migrations, load HLC
}
```

Call from `src/pages/newtab/start.tsx` and `src/background.ts`.

---

### 9.3 Migration from Current Storage

Create migration from v0 (current format) to v1 (new format):

1. Read all current keys
2. Wrap each in `StorageRecord` with initial HLC
3. Write to new format
4. Preserve existing data structure

---

### 9.4 Update Consumers

Gradually migrate existing code:

| Current API | New API |
|-------------|---------|
| `storage.getOne(key)` | `storage.get(storage.schema.key)` |
| `storage.setOne(key, val)` | `storage.set(storage.schema.key, val)` |
| `useBrowserStorageValue(key, default)` | `useStorageValue(storage.schema.key)` |
| `NamespacedStorage` | `storage.get(schema.collection.byId(...))` |
| `getPluginStorage(id)` | Dedicated collection in schema |
| `getWidgetStorage(id)` | Dedicated collection in schema |

---

## File Structure

```
src/utils/storage/
├── index.ts                 # Public exports
├── types.ts                 # Core types
├── hlc.ts                   # HLC implementation
├── storage.ts               # Storage instance (singleton)
├── query.ts                 # Query resolution
├── events.ts                # Change events
├── opfs.ts                  # OPFS helpers
├── files.ts                 # File storage
├── react.ts                 # React hooks (import storage directly)
├── schema/
│   ├── index.ts
│   ├── cell.ts
│   ├── collection.ts
│   ├── entity.ts
│   ├── file.ts
│   ├── version.ts
│   └── versioned.ts
├── operations/
│   ├── read.ts
│   ├── write.ts
│   └── delete.ts
├── sync/
│   ├── outbox.ts
│   ├── merge.ts
│   └── export.ts
├── migrations/
│   ├── runner.ts
│   └── context.ts
├── anori-schema.ts          # Anori's schema definition
├── init.ts                  # Storage initialization
└── __tests__/
    ├── utils.ts
    ├── hlc.test.ts
    ├── schema.test.ts
    ├── storage.test.ts
    ├── files.test.ts
    ├── merge.test.ts
    └── migrations.test.ts
```

---

## Implementation Order

Recommended implementation sequence:

```
Phase 1: Foundation
  └─ 1.1 Add Zod ────────────────────────────┐
  └─ 1.2 HLC ────────────────────────────────┤
  └─ 1.3 Storage Record Types ───────────────┘
                                             │
Phase 2: Schema Definition ◄─────────────────┘
  └─ 2.1-2.5 (can be done in parallel)
                                             │
Phase 3: Core Storage ◄──────────────────────┘
  └─ 3.1 Storage Instance
  └─ 3.2 Query Resolution
  └─ 3.3-3.5 Operations
  └─ 3.6 Events
                                             │
Phase 4: Files Storage ◄─────────────────────┤
  └─ 4.1-4.3 (can parallel with Phase 5)     │
                                             │
Phase 5: Reactive API ◄──────────────────────┘
  └─ 5.1-5.2
                                             │
Phase 6: Sync Integration ◄──────────────────┘
  └─ 6.1-6.3
                                             │
Phase 7: Migration System ◄──────────────────┘
  └─ 7.1-7.2
                                             │
Phase 8: Testing ◄───────────────────────────┤
  └─ (continuous, alongside each phase)      │
                                             │
Phase 9: Integration ◄───────────────────────┘
  └─ 9.1 Define schema
  └─ 9.2 Initialize
  └─ 9.3 Migrate current storage
  └─ 9.4 Update consumers
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Backup before migration; rollback on error |
| Performance with large collections | Batch reads; lazy loading; cache prefix scans |
| HLC clock drift | Use max(local, remote) for pt; increment lc on conflict |
| Schema version mismatch in sync | Reject incompatible remote changes; require upgrade |
| OPFS quota limits | Monitor usage; cleanup tombstoned files |

---

## Open Questions

1. **IndexedDB vs chrome.storage.local** — Current plan uses chrome.storage.local for simplicity. IndexedDB could offer better performance for large datasets and true transactions. Evaluate after Phase 3.

2. **Tombstone cleanup** — When to permanently delete tombstoned records? Options:
   - After confirmed sync
   - After N days
   - Manual cleanup

3. **Batching writes** — Current plan writes immediately. Consider batching for performance:
   - Debounce writes
   - Transaction-like API for multiple writes

4. **File deduplication** — Should we hash files and dedupe by content? Adds complexity but saves storage.

---

## Success Criteria

- [ ] All current storage operations work with new API
- [ ] HLC timestamps tracked on all writes
- [ ] Schema validation catches invalid data
- [ ] Migrations run successfully from v0
- [ ] Outbox tracks changes for sync
- [ ] Remote changes merge correctly with LWW
- [ ] React hooks provide reactive updates
- [ ] File storage tracks changes with HLC
- [ ] No data loss during migration
- [ ] Type safety throughout (minimal `any`)
