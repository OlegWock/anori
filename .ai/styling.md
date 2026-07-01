# Styling Guidelines

Anori styles with **Panda CSS** + a token-based **design system**. There is **no SCSS** in the project
(the old `base.scss`/`utils.scss` and per-component `.scss` files were removed). Don't add `.scss` files,
BEM class names, or `@use`/mixins.

## Authoring styles

Use Panda's APIs, imported from `styled-system/*`:

```tsx
import { css, cva, cx } from "styled-system/css";
import { styled } from "styled-system/jsx";

// One-off styles → css()
const row = css({ display: "flex", alignItems: "center", gap: "2", color: "text.subtle" });

// Variants → cva()
const badge = cva({
  base: { borderRadius: "md", paddingInline: "2", fontSize: "sm" },
  variants: { tone: { info: { bg: "control" }, accent: { bg: "accent", color: "on-accent" } } },
  defaultVariants: { tone: "info" },
});

// A styled element → styled()
const Card = styled("div", { base: { bg: "surface", boxShadow: "surface.edge", borderRadius: "lg", padding: "5" } });

<div className={cx(row, badge({ tone: "accent" }))} />
```

* Style **in the component file** with `css`/`cva` consts at module scope — there is no separate style file.
* Each component lives in its own folder: `ComponentName/ComponentName.tsx` (don't add flat files).
* Use `cx(...)` (from `styled-system/css`) to combine class names. Note: class-attribute order never
  decides the winner — only stylesheet source/layer order does. `css(objA, objB)` merges objects (later
  wins) but only dedupes when keys match exactly (shorthand `py` and longhand `paddingBlock` don't merge).

## Design tokens — always prefer tokens over raw values

Colours are **not** known at build time: the design system computes an OKLCH palette from the user's
**accent colour + light/dark mode** and injects it at runtime as `--ds-*` CSS vars (see
`src/design-system/apply.ts` + `color-engine.ts`). Panda's semantic colour tokens map onto those vars, so
**use the semantic token names — never hardcode hex/hsl/oklch** (and don't reintroduce legacy `--text`,
`--background`, etc.; they're gone).

* **Surfaces**: `surface` / `surface.edge`, `surface.elevated` / `surface.elevated.edge` / `surface.elevated.border`
  (cards, modals, and panels all use this one family; there is no separate `card`/`modal` token)
* **Controls**: `control` / `control.border` / `control.hover` / `control.disabled` / `control.edge`
* **Accent**: `accent` / `accent.hover` / `accent.disabled` / `accent.border` / `accent.edge`, and
  `on-accent` / `on-accent.disabled` for content on an accent fill
* **Text**: `text.primary` → `text.subtle` → `text.placeholder` → `text.disabled` (hierarchy)
* **Icons**: `icon`, `icon.strong`, `icon.subtle`, `icon.placeholder`
* **Frosted overlays** (translucent text-primary, for blurred surfaces): `frosted` / `frosted.subtle` / `frosted.strong`
* **Tooltip** (fixed, theme-independent): `tooltip` / `on-tooltip`

Other scales:

* **Spacing** is **density-aware**: use numeric tokens (`"0-5"`, `"1"`, `"1-5"`, `"2"` … `"16"`); compact
  mode auto-compresses them. Don't hardcode `rem` for spacing.
* **Radii**: `xs` `sm` `md` `lg` `xl` `2xl` `full`.
* **Font sizes**: `2xs` `xs` `sm` `base` `lg` `xl` `2xl` `3xl` `display`.
* **Font weights**: `light` (300) `regular` (400) `medium` (500) `semibold` (600). **No bold** — the design
  uses a light register; don't use 700+.
* **Shadows**: `raised`, `overlay`, `popover`, and the `*.edge` tokens (`surface.edge`,
  `surface.elevated.edge`, `control.edge`, `accent.edge`) which are a **1–2px inset ring** standing in for
  a border (`boxShadow: "surface.edge"` ≈ a `surface.border`), costing no layout. Pair the shadow with the
  matching colour token.
* **z-index**: named ladder — `base` `docked` `dropdown` `modal` `toast` `tooltip` `app-cover`. Don't use
  raw z-index numbers.

## Conditions (states / density)

Use Panda conditions instead of media/pseudo selectors where possible:

* `_hover`, `_focus`, `_focusVisible`, `_disabled`, etc.
* `_compact` → compact density (`.compact-mode-active &`). Spacing tokens already shrink in compact mode;
  use `_compact` only for adjustments tokens can't express.

```tsx
css({ bg: "control", _hover: { bg: "control.hover" }, _compact: { borderRadius: "sm" } });
```

## Prefer design-system components

Before styling from scratch, reach for a primitive in `@anori/design-system/components/<Name>/<Name>`:
`Button`, `IconButton`, `LinkButton`/`LinkIconButton`, `Field`, `Input`, `Textarea`, `Card`, `Badge`,
`Alert`, `Modal`, `Popover`, `Tooltip`, `Hint`, `MenuList`, `Combobox`, `Select`, `Slider`, `Checkbox`,
`Heading`, `Link`, `TextButton`, `ScrollArea`, `ClampTextToFit`, `EmptyState`, `Icon`, `HueChromaPicker`.
These own their tokens/states/sizing (incl. `normal`/`compact` sizes) — extend via props, not by
re-implementing.

## Icons

Use the icon system, not inline SVGs. Add an icon by importing the raw SVG and registering it in
`src/design-system/components/Icon/builtin-icons.ts`:

```ts
import IonAdd from "~icons/ion/add?raw"; // any @iconify collection: ~icons/<collection>/<name>?raw
// → add to builtinIconSvgsBySourceId, then a semantic name in `builtinIcons`
```

Render with `<Icon icon={builtinIcons.add} />`, or pass `iconStart`/`iconEnd` to `Button`/`IconButton`
(they own the icon's size/colour/alignment).

## Global styles & cascade layers

* App-wide globals (reset, element defaults, body typography) live in `panda.config.ts` `globalCss`; the
  Nunito face is in `globalFontface`. Panda emits these into **`@layer base`** so component utilities win.
* `preflight` is **off** on purpose — we ship a deliberately lighter reset than Panda's preflight (which
  would strip list markers and link underlines the markdown content relies on).
* Newtab page-level globals that target elements in the generated HTML (`#root`, `.loading-cover`, the
  full-screen `body`) live in `src/pages/newtab/globals.css`, **unlayered**.
* Layer order: `reset, base, tokens, recipes, utilities`. **Unlayered styles beat every layer** — note
  that Chrome injects an unlayered `body { font-family: system-ui; font-size: 75% }` into extension pages,
  which is why the global `body` font-family/font-size are marked `!important`.

## Misc

* **Scrollbars**: use the `<ScrollArea />` component instead of native `overflow: scroll`.
* **Viewport units**: use `100dvh`/`100dvw` (not `vh`/`vw`).
* **Runtime values** that can't be tokens (e.g. a measured size) go through a CSS custom property set
  inline and read in `css()` — e.g. `--scrollbar-size`, `--max-rows`, `--widget-box-percent`,
  `--background-image` (the wallpaper). Don't invent new global theme vars.
* **Overriding a DS component's atomic class** when you must: append `!` / ` !important` to the value
  (`paddingBlock: "0-5!"`). Use sparingly.
