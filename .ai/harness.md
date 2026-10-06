# Browser harness (drive the extension programmatically)

`harness/` builds the extension, loads it into a **headless** Chromium, and lets you drive the new tab page with Playwright from the shell — no manual steps, no window popping up on the user's screen. Use it to see a change working in the real extension, take screenshots, or reproduce a UI bug. Chrome only.

## Start a session

An agent's shell cannot hold stdin open, so run the harness in the background and talk to it through the control socket:

```sh
mkdir -p .harness && pnpm harness > .harness/out.log 2>&1 &   # builds dist/harness, launches Chromium, watches sources
# wait for {"kind":"ready",...} in .harness/out.log (first build ~5 s; first run downloads Chromium once)
pnpm harness:send '{"cmd":"open"}'               # -> {"pageId":1}
pnpm harness:send '{"cmd":"run","code":"await page.getByRole(\"button\",{name:\"Edit folder\"}).click()"}'
pnpm harness:send '{"cmd":"screenshot","name":"edit-mode"}'
pnpm harness:send '{"cmd":"quit"}'               # closes the browser and exits
```

Each `harness:send` prints exactly one JSON line — that command's result. Events the harness emits on its own (`built`, `build-failed`, `reloaded`, page console errors) go to its stdout, i.e. the log file. Only one harness runs at a time (`.harness/control.sock`). Flags: `--headed` shows the window, `--no-watch` disables the source watcher, `--fresh` wipes the profile before launching. `pnpm harness --help` lists every command.

## Commands

`pageId` defaults to the most recently opened page.

| Command | Result |
|---|---|
| `{"cmd":"open"}` | Opens the new tab page. `{"pageId":n}` |
| `{"cmd":"pages"}` | Open pages with their ids. |
| `{"cmd":"close","pageId":n}` | |
| `{"cmd":"eval","code":"document.title"}` | Runs code **inside the page** (`page.evaluate`). |
| `{"cmd":"run","code":"..."}` | Runs code **in the harness process** with `page`, `api`, `harness`, `context` in scope. Async; `return` a JSON value to see it. This is how you click, type, hover, wait — anything from Playwright's `Page` API. |
| `{"cmd":"api","method":"getState","args":[]}` | Calls the in-page test API (below). |
| `{"cmd":"script","file":"harness/scratch/x.ts"}` | Imports the file and awaits its exported `run(harness)`. Re-imported on every call, so edit and re-run freely. |
| `{"cmd":"screenshot","name":"x"}` | Saves `.harness/screenshots/<name>-<timestamp>.png`. |
| `{"cmd":"reload"}` | Reloads the extension from disk and reopens its pages (same ids). Done automatically after each successful build. |
| `{"cmd":"reset"}` | Closes the browser, wipes the profile, relaunches. Back to a fresh install with onboarding. |
| `{"cmd":"quit"}` | |

## Edits take effect without restarting

The harness runs `rspack --watch` writing to `dist/harness` (kept apart from `dist/chrome`). After every successful build it reloads the extension and reopens the pages you had, printing `{"kind":"reloaded","pageIds":[...]}` to the log. A broken build prints `build-failed` with the errors and reloads nothing. So: edit source → wait for `reloaded` in the log → verify. In-page state (edit mode, an open modal) does not survive a reload; storage does.

The profile lives in `.harness/profile` and persists between sessions, so widgets, folders and settings you set up carry over. `reset` or `--fresh` is the way back to a clean install.

## Scripts

For multi-step work, write a script instead of chaining `run` commands. Put throwaway scripts in `harness/scratch/` (gitignored, but keep them there rather than in a temp dir so the next agent can find them); scripts worth keeping go in `harness/examples/`. A script exports `run`:

```ts
import type { AnoriHarness } from "../launch.ts";

export const run = async ({ openNewTab, screenshot, testApi }: AnoriHarness) => {
  const page = await openNewTab();                   // registered like {"cmd":"open"}
  await page.getByRole("button", { name: "Edit folder" }).click();
  const state = await testApi(page).getState();
  await screenshot(page, "edit-mode");
  return state.widgets.length;                       // shown as the command's result
};
```

Run it with `{"cmd":"script","file":"harness/scratch/<name>.ts"}`. `harness/examples/demo-tour.ts` is a longer tour (wizard, typing into widgets, test API, settings) meant for watching in `--headed` mode. Node 26 runs `.ts` natively: plain TypeScript, `.ts` extensions on relative imports, no path aliases, no enums. `harness/examples/add-first-widget.ts` is a complete example.

## Finding elements

Prefer role + accessible name. A fresh profile is in English.

* Sidebar buttons have `aria-label`s: `Home`, `What's new`, `Connect` (or `Account`), `Edit folder`, `Settings`, and one per folder (the folder name).
* Edit-mode toolbar: `Add widget`, `Done`. Widget controls (edit mode): `Move widget`, `Remove widget`, `Edit widget`, `Resize widget`.
* In the "Add widget" wizard every widget card is `role="button"` with `aria-label` = widget name (e.g. `Date and time - size S`). Use `getByLabel(name, { exact: true })` rather than `getByRole("button", { name })`: the wizard's plugin menu on the left has an entry with the same text as single-widget plugins (e.g. `Notes`). Config screens end with a `Save` button; the search box is `getByPlaceholder("Search...")`.
* Widget cards in the grid: `#WidgetCard-<instanceId>`, class `WidgetCard`. Outside edit mode a card carries no dnd-kit attributes (`WidgetCard.tsx` strips them), so inputs inside widgets are clickable; in edit mode the Move handle is the draggable.
* Development builds stamp every element with `data-component="<ComponentFile>"` and `data-source="<path>:<line>"` (from `src/dev-jsx`), useful when you need to know what rendered something.

If an element has no stable hook, **add one**: an `aria-label` where it also helps accessibility, otherwise a `data-testid`. Keep it minimal and commit it with your change.

## In-page test API (`window.__anoriTestApi`)

A small, **development-build-only** API. `src/utils/test-api.ts` defines the type and the `useInstallTestApi` hook; `Workspace.tsx` builds the object. Reach it via `{"cmd":"api",...}`, via `api` in a `run` command, or via `testApi(page)` in a script.

* `getState()` → `{ activeFolderId, isEditing, grid, widgets: [{ instanceId, pluginId, widgetId, x, y, width, height, configuration }] }`
* `setEditMode(enabled)`
* `moveWidget(instanceId, { x, y })` — repositions a widget with the same overlap/bounds validation the drop handler uses (`canPlaceItemInGrid`), then persists through `handleLayoutUpdate`; throws if the target is occupied or out of bounds. Added because `@dnd-kit` drag cannot be driven reliably with synthetic pointer events.

The base is deliberately tiny. **Extend it when Playwright can't do something** — the known case is drag-and-drop widget repositioning, which `@dnd-kit` makes hard to drive with synthetic pointer events:

1. Add the method to the `AnoriTestApi` type in `src/utils/test-api.ts`.
2. Implement it in the `testApi` memo in `Workspace.tsx`, which has `widgets`, `gridDimensions`, `handleLayoutUpdate` and `setIsEditing` in scope.
3. **Mirror the UI action; never bypass its checks.** A `moveWidget(instanceId, position)` must run the same validation the drag handler runs — `canPlaceItemInGrid` / `computeDisplacedMoves` from `src/utils/grid/utils.ts` and `src/pages/newtab/components/WidgetsGrid/displacement.ts` — and then go through `handleLayoutUpdate`, exactly like `use-drag-snap-position.ts` does. Don't write positions straight into storage. If the logic you need lives inside a component, extract a pure function both can call.
4. Keep methods generic (instance ids, grid positions, folder ids). Arguments and return values must be JSON-serializable; the harness proxy picks new methods up automatically.

## Gotchas

* The harness needs a **development** build (`pnpm build:harness` or the watcher). Production builds have no `__anoriTestApi` and no `data-component`. Harness builds additionally define `X_HARNESS = true` (rspack `--env outDir=harness`), which the background uses to skip opening the welcome tab on install; use it for anything else that should differ only under the harness.
* MV3 extensions only load in Chromium's new headless mode, which is what `channel: "chromium"` + `headless: true` gives. Don't switch to the headless shell.
* The viewport (and therefore `window.screen.width`, which Playwright emulates to match) defaults to 1920x1080 so the extension stays above the automatic compact-mode threshold of 1500px. Pass `viewport` to `launchAnori` to test compact mode.
* Chrome 138+ shows a footer under extension new-tab pages ("Customize Chrome", extension attribution). The launcher writes `NewTabPage.FooterVisible = false` into the profile's `Default/Preferences` before every launch, so it stays hidden on fresh profiles too.
* The profile is an isolated fresh install: no cloud account, onboarding shown until the first widget is added. The onboarding's "apply preset" button is the quickest way to a populated folder.
* Chrome caches an unpacked extension's compiled scripts inside the profile; the harness drops those caches on launch, so a stale bundle is not a thing you should see. If behavior looks stale anyway, `reload`.
* **Styles look unstyled after a watch rebuild** (new Panda classes are on the elements but have no CSS): Panda's PostCSS plugin was not re-run for `src/panda.css`. `postcss.config.cjs` registers every extracted source file as a dependency of `panda.css` precisely so rspack re-runs it, and `panda.config.ts` must **not** list source files under `dependencies` (that makes every edit a "config change", which regenerates the context and emits stale CSS). If it happens anyway, `quit` and start the harness again — a fresh build always extracts everything — and then investigate `postcss.config.cjs` / `panda.config.ts`.
