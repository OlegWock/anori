# Anori

Browser extension (Chrome MV3 + Firefox MV2) that lets users compose their own new tab page from widgets. Built with TypeScript, React, Panda CSS, and compiled with rspack.

## Setup

- Package manager: **pnpm** (not npm/yarn)
- `pnpm fmt` — format, `pnpm typecheck` — typecheck, `pnpm lint` — lint (all run via git hooks, invoke manually only when asked)
- Entry points: `src/pages/newtab/start.tsx` (new tab page), `src/background.ts` (service worker)

## Project Structure

- `src/plugins/` — all plugins, each provides widgets via `definePlugin({ widgets })`
- `src/components/` — shared React components
- `src/pages/` — extension pages (auto-discovered by rspack)
- `src/contentscripts/` — content scripts (auto-discovered)
- `src/utils/` — reusable utilities
- `src/translations/` — i18n files (i18next)
- `src/assets/` — static assets

## Key Rules

Detailed rules live in `.ai/`. Summaries below:

### General
TypeScript only. Use `assertValue()` from `@anori/utils/asserts` instead of `!` non-null assertions. Before dangerous git operations, backup the branch.
Full rules: @.ai/base.md

### Comments
**Do not write new code comments — at all.** This is a hard rule, not a preference. When you write or change code, add zero comments; put the effort into clear names and structure instead. If you feel a comment is needed to explain something, treat that as a signal to make the code clearer.

- **Do not remove existing comments.** You may *edit* an existing comment only when your change makes it contradict the code — update it to match, or trim just the now-false part.
- The **only** exception is tooling-required directives that are not prose (`biome-ignore`, `@ts-expect-error`, `eslint-disable`): write these only when the tool actually needs them, and keep them minimal.

After writing or editing code, scan your diff for any `//`, `/* */`, or `{/* */}` you introduced and delete them (except the tooling directives above).

### Plugins & Widgets
Widgets are the main building block. Plugins provide widgets via `definePlugin`/`defineWidget` (from `@anori/utils/plugins/define`) and are registered in `src/plugins/all.ts`. A plugin has an **identity** — `definePlugin({ id, name, icon, config?, widgets })` — and **behaviors** chained on it: `.withMessaging()`, `.withScheduledCallback(intervalMinutes, cb)`, `.withOnStart(cb)`, then `.build()` (required). Behavior callbacks receive a typed `PluginContext` (`ctx.getWidgets()` — instances typed/correlated per descriptor; `ctx.getConfig()` — plugin config); recover its type with `export type FooContext = ContextOf<typeof base>` and import it **type-only** into `background.ts` (avoids the plugin↔background cycle). `config?: { schema, configurationScreen }` declares plugin-level config shared across widgets (delivered to widgets as `pluginConfig`). `defineWidget` takes an optional `schema` (a zod type; decoded on read, encoded on write — defaults to a passthrough cast); widgets get `WidgetRenderProps<WidgetConfig, PluginConfig>`. Widgets also have hooks like `useWidgetMetadata()`, `useParentFolder()`, `useSizeSettings()`, and storage APIs (`usePluginStorage`, `useWidgetStorage`). Small plugins live in a single file; larger ones split into `types.ts`, `storage.ts`, `messaging.ts`, `background.ts`, and a `widgets/` subfolder with per-widget components, config screens, and `descriptors.ts`. Wrap every widget `mainScreen`/`mock` component in `React.memo` (named function, not anonymous arrow) — the folder grid re-renders for reasons unrelated to any one widget, and `memo` lets it bail; see `blueprint`'s `BlueprintWidget`.
Full rules: @.ai/plugins.md

### Styling
**Panda CSS** + a token-based design system (no SCSS). Author styles with `css`/`cva`/`cx` from `styled-system/css` (and `styled` from `styled-system/jsx`), co-located in the component file; each component lives in `ComponentName/ComponentName.tsx`. Colours come from an OKLCH palette generated at runtime from the accent + light/dark mode (`src/design-system/apply.ts`) and injected as `--ds-*` vars — always use **semantic tokens** (`surface`, `text.primary`, `accent`, `control`, `frosted`, …), never hardcoded colours. Spacing is density-aware (numeric tokens, `_compact`); font weights stop at `semibold` (no bold); `*.edge` shadows replace borders; z-index uses a named ladder. Prefer existing primitives in `@anori/design-system/components/`; add icons via `builtin-icons.ts` and render with `<Icon>`. Use `<ScrollArea />` instead of `overflow: scroll`, and `100dvh`/`100dvw` for viewport units. The design system also has **review rules** (judgment calls not lintable: no reduced-contrast text on frosted surfaces, edge-vs-border, semantic token naming `family.option.state` / `on-<fill>`, labelled controls use `Field`).
Full rules: @.ai/styling.md and @.ai/design-system-rules.md

### Localization
i18next + react-i18next. `en` is the only source of truth; `uk` is hand-verified. Use `useTranslation` hook in React, `translate()` outside. Other languages are LLM-translated (OpenRouter) and committed: `pnpm translations:status`, `pnpm translations:translate <lang|all>`, `pnpm translations:clean`. Incremental re-translation is gated by `src/translations/fingerprints.json` (hash of the `en` value each translation derived from); `notes.json` holds optional per-key usage context for the model. New languages must also be added to `rspack.config.ts` (MomentLocalesPlugin), `translations-manager.ts` (FINISHED_TRANSLATIONS, LANGUAGE_ENGLISH_NAMES), and `src/translations/metadata.ts`.
Full rules: @.ai/localization.md

### Storage & Sync
Schema-based type-safe storage in `src/utils/storage-lib/` and `src/utils/storage/`. Uses cells (single values) and collections (keyed records). HLC-based Last-Write-Wins conflict resolution for cloud sync. `tracked: true` adds changes to sync outbox. React hooks: `useStorageValue()`. Storage forks prevent echo on own writes. Migrations are atomic, run on in-memory snapshots.
Full rules: @.ai/storage-and-sync.md

### Cloud Integration
tRPC + React Query for cloud API. Use `useCloudAccount()` for connection status, `trpc.*` hooks for API calls, `getApiClient()` for imperative usage. Error handling via `isAppErrorOfType()` — never use `instanceof`.
Full rules: @.ai/cloud-integration.md
