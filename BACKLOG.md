# Backlog

## Styling: Design System Foundation

### No spacing scale

Padding, margin, and gap values are typed as raw numbers across 60+ SCSS files, mixing `px` and `rem` with no shared scale. There are ~15 distinct spacing values in use. Some files even mix units internally (e.g. `anki/styles.scss` uses both `gap: 1rem` and `gap: 12px`). This makes it impossible to adjust spacing globally and forces every author to pick a number from memory.

### Border radius inconsistency

61 `border-radius` declarations use 14 distinct values (3, 4, 6, 8, 9, 10, 12, 15, 16, 18, 24, 36, 9999, 9999999px). The style rules mention 8/12/24/36 as standard, but in practice many other values are used. There's no shared variable, so there's no way to know which value is "correct" for a given context. Also `datetime/styles.scss` has `border-radius: 9999999px` which is just a typo for `9999px`.

### Font sizes are ad-hoc

Components use ~12 different font-size values, many nearly identical but slightly different (0.8125rem, 0.85rem, 0.875rem, 0.9rem). There's no type scale, so each component picks its own value. Less impactful than spacing/radius since font sizes vary less across the app, but still adds cognitive load.

### A few hardcoded colors

Most colors correctly use CSS variables, but `Button.scss` hardcodes `#2689e4` for LinkButton (the only blue in the design), `FolderButton.scss` hardcodes `rgb(247, 60, 60)` for a notification dot, and `ShortcutsHelp.scss` hardcodes a gray border. These can't be themed and will break if the palette ever changes. The general direction is to introduce CSS variables for these.

### Repeated layout patterns

`display: flex; flex-direction: column; gap: X` appears 40+ times. Same for flex-row-centered, text-truncation (`white-space: nowrap; text-overflow: ellipsis; overflow: hidden`), and hover-background patterns. Not a bug, but a lot of boilerplate. Could be addressed with shared mixins in `utils.scss`.

## Split Large Files

### `Settings.tsx` (745 lines)

Contains 8 distinct screen components (General, CustomIcons, Folders, Plugins, ImportExport, Themes, HelpAbout) plus the modal wrapper, all in one file. Each screen is self-contained with its own state and has no reason to live alongside the others. ThemesScreen was already extracted to its own file, which proves the pattern works.

### `Onboarding.tsx` (424 lines)

Same issue as Settings -- multiple step screens (start, folders, customization, analytics, presets) in a single file. Each step is independent.

### `WhatsNew.tsx` (450 lines)

Release notes component that grows with every release. Contains entries going back to the beginning. Old entries will never be seen by users who update regularly. The file will only get bigger over time.

### `storage/schema/index.ts` (397 lines)

All schema definitions for every domain (folders, plugins, widgets, themes, analytics, cloud) in one file. Unrelated schemas are packed together, making it hard to find what you need and easy to create merge conflicts.

## Code Cleanup

### `clearWidgetStorage` hardcoded list

In `src/utils/scoped-store.ts`, `clearWidgetStorage()` has a manually maintained list of every widget store collection. Adding a new widget store means remembering to update this function, and forgetting means dangling data. The code already has a TODO acknowledging this. Needs some kind of registration mechanism so widget stores are automatically cleaned up.

### `lazy-components.tsx` hierarchy violation

`src/components/lazy-components.tsx` imports from `src/pages/newtab/` (SettingsModal, NewWidgetWizard), which means a shared module depends on page-specific code. This breaks the dependency hierarchy and the file itself has a TODO about it. The page-specific lazy loaders should live closer to the page that uses them.
