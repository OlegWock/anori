# Anori

Browser extension (Chrome MV3 + Firefox MV2) that lets users compose their own new tab page from widgets. Built with TypeScript, React, SCSS, and compiled with rspack.

## Setup

- Package manager: **pnpm** (not npm/yarn)
- `pnpm fmt` — format, `pnpm typecheck` — typecheck, `pnpm lint` — lint (all run via git hooks, invoke manually only when asked)
- Entry points: `src/pages/newtab/start.tsx` (new tab page), `src/background.ts` (service worker)

## Project Structure

- `src/plugins/` — all plugins, each provides widgets via `definePlugin().withWidgets()`
- `src/components/` — shared React components
- `src/pages/` — extension pages (auto-discovered by rspack)
- `src/contentscripts/` — content scripts (auto-discovered)
- `src/utils/` — reusable utilities
- `src/translations/` — i18n files (i18next)
- `src/assets/` — static assets

## Key Rules

Detailed rules live in `.cursor/rules/`. Summaries below:

### General
TypeScript only. Use `assertValue()` from `@anori/utils/asserts` instead of `!` non-null assertions. Before dangerous git operations, backup the branch.
Full rules: @.cursor/rules/base.mdc

### Plugins & Widgets
Widgets are the main building block. Plugins provide widgets via `definePlugin`/`defineWidget` and are registered in `src/plugins/all.ts`. `definePlugin` accepts static fields (id, name, icon, configurationScreen); after `.withWidgets()`, optional builder methods `.withOnMessage()`, `.withScheduledCallback()`, `.withOnStart()` can be chained in any order; `.build()` is required as the final call. `withScheduledCallback` and `withOnStart` callbacks receive `self` (the fully-typed plugin), avoiding circular imports in multi-file plugins. Widgets have access to hooks like `useWidgetMetadata()`, `useParentFolder()`, `useSizeSettings()`, and storage APIs (`usePluginStorage`, `useWidgetStorage`). Small plugins live in a single file; larger ones split into `types.ts`, `storage.ts`, `messaging.ts`, `background.ts`, and a `widgets/` subfolder with per-widget components, config screens, and `descriptors.ts`.
Full rules: @.cursor/rules/plugins.mdc

### Styling
SCSS with BEM-like naming (`.ComponentName`, `.ComponentName-modifier`, nested kebab-case children). Use `@use` not `@import`. Theme via CSS variables (`--accent`, `--background`, `--text`, etc.). Use `utils.hover` mixin instead of `:hover`. Use `<ScrollArea />` instead of `overflow: scroll`. Prefer `rem` for spacing, `px` for borders. Use `100dvh`/`100dvw` for viewport units.
Full rules: @.cursor/rules/styling.mdc

### Localization
i18next + react-i18next. `en` is the only source of truth; `uk` is hand-verified. Use `useTranslation` hook in React, `translate()` outside. Other languages are LLM-translated (OpenRouter) and committed: `pnpm translations:status`, `pnpm translations:translate <lang|all>`, `pnpm translations:clean`. Incremental re-translation is gated by `src/translations/fingerprints.json` (hash of the `en` value each translation derived from); `notes.json` holds optional per-key usage context for the model. New languages must also be added to `rspack.config.ts` (MomentLocalesPlugin), `translations-manager.ts` (FINISHED_TRANSLATIONS, LANGUAGE_ENGLISH_NAMES), and `src/translations/metadata.ts`.
Full rules: @.cursor/rules/localization.mdc

### Storage & Sync
Schema-based type-safe storage in `src/utils/storage-lib/` and `src/utils/storage/`. Uses cells (single values) and collections (keyed records). HLC-based Last-Write-Wins conflict resolution for cloud sync. `tracked: true` adds changes to sync outbox. React hooks: `useStorageValue()`. Storage forks prevent echo on own writes. Migrations are atomic, run on in-memory snapshots.
Full rules: @.cursor/rules/storage-and-sync.mdc

### Cloud Integration
tRPC + React Query for cloud API. Use `useCloudAccount()` for connection status, `trpc.*` hooks for API calls, `getApiClient()` for imperative usage. Error handling via `isAppErrorOfType()` — never use `instanceof`.
Full rules: @.cursor/rules/cloud-integration.mdc
