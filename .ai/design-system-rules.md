# Design system — review rules (developer-enforced)

Rules that are **hard or impossible to enforce programmatically**, so they rely on developer discipline to follow and on code review to catch violations. (Anything that *can* be reliably linted belongs in lint/stylelint config, not here.)

Each rule: the rule, why it exists, and what to watch for in review.

---

## DS-1 — No subtle text on frosted backgrounds

**Rule:** On a **frosted** background (a translucent surface with a `backdrop-filter` blur), text must use **`text-primary`** only. The reduced-contrast text tokens (`text-subtle`, `text-placeholder`, `text-disabled`) are **not allowed** there — they are reserved for surfaces with a **solid** background.

**Why:** a frosted surface lets a blurred, arbitrary backdrop (the wallpaper) show through, so its effective contrast is low and unpredictable. Reduced-contrast text on it becomes illegible. A solid surface has a known, uniform background where subtle text stays readable. On frosted surfaces, visual hierarchy must come from **size/weight**, not from reducing text contrast.

**Watch for (review):** any reduced-contrast text token used on an element that sits — directly or via a nested child — on a frosted surface. Whether an element's *effective* background is frosted depends on composition and nesting at runtime, which is why this is a judgment call for the author/reviewer rather than a reliable static check.

## DS-2 — Semantic tokens reference primitives, not arbitrary curve points

**Rule:** Tier-3 semantic tokens must resolve to a fixed **numbered primitive step** — they must not sample the continuous curve (`colorAt` / `tintedColorAt`) at an arbitrary lightness. The **one sanctioned exception is sub-step relational shades** — a fill nudged a fraction of a step off a base — which must go through the shared **`shade`** helper with a **named delta** (`HOVER_DELTA`, `EDGE_DELTA`, …). This covers interaction states (hover/active/focus) and subtle edges that need to sit *between* two steps. Don't hand-roll off-scale values anywhere else.

**Why:** the numbered primitives are the shared, finite vocabulary; letting each static role drift to its own arbitrary curve point reintroduces exactly the color sprawl the scale exists to prevent. The cases that legitimately need finer granularity than the scale — a hover state, a barely-there edge — are all the *same operation*: a small, uniform nudge off a base fill. Keeping that in one helper with a fixed set of named deltas keeps it a single rule rather than per-token magic.

**Watch for (review):** any `colorAt` / `tintedColorAt` call inside the Tier-3 token map that isn't `shade`, and any new `*_DELTA` constant — the deltas are a small, deliberate set, not a per-token escape hatch. New states/edges should reuse `shade` with an existing delta.

## DS-3 — Edge vs border

**Rule:** A 1–2px outline on an element is one of two distinct roles; name and pick the token by intent:

- **edge** (the `*.edge` *shadow* tokens — `surface.edge`, `surface.elevated.edge`, `control.edge`, `accent.edge` — backed by the matching `*.edge` colors): a *barely* different shade of the fill — a sub-step `shade`/`EDGE_DELTA` derivation. It reads as **volume/lift**, not separation. Use it on **surfaces** (cards, panels, raised containers). **Render it as a 1–2px inset `box-shadow`, not a `border`** — so it costs no layout/box-model and composes with elevation shadows (e.g. a dragged card shows `surface.edge, overlay`). An edge should never be the thing that makes an element legible against its background.

- **border** (`border`, `*-border`, e.g. `control.border`, `accent.border`): a **clearly distinct** color from the fill, applied as a real `border`, used to **delineate / separate** an element from what's behind it (e.g. the secondary button on the frosted plate). Borders carry meaning — they say "this is a discrete control," so they're allowed to contrast.

**Pick by intent:** does the outline need to *separate* the element so it's distinguishable (→ **border**), or just give a flat fill some *volume* (→ **edge**)? Surfaces get edges; controls that must read as distinct get borders. Don't reach for a `border` token to add subtle volume, and don't water a `border` down to an edge — split it into the right token.

**Watch for (review):** an `*-edge` token used where an element needs real separation (it'll look flat/undefined), or a `border` token used merely for volume on a surface (it'll look boxed-in). New surface-like roles should expose an `edge`; new control-like roles a `border`.

## DS-4 — Token naming: `family.option.state`; foregrounds are `on-<fill>`; disabled stays in-family

**Rule:** Name semantic colour tokens **`family[.option][.state]`** (e.g. `accent`, `accent.edge`, `accent.disabled`, `control.border`, `surface.elevated.edge`). A foreground colour that sits *on* a coloured fill belongs to its **own `on-<fill>` family** (`on-accent`, `on-accent.disabled`) — don't nest it under the fill (so no `accent.text`). A **disabled** state is a muted shade of the element's **own family** (`accent.disabled`, `control.disabled`), **never `surface`**; and any foreground-on-a-fill is **APCA-picked** (`bestTextOn`) for legibility, not a fixed neutral.

**Why:** keeps the vocabulary predictable and preserves each variant's identity when disabled; APCA-picked foregrounds stay readable across themes/modes — a fixed `text.subtle` went dark-on-mid and became unreadable on the light-mode disabled primary.

**Watch for (review):** a disabled fill pointing at `surface`; a foreground nested under a fill (`accent.text`) instead of an `on-*` family; fixed neutral text on a coloured fill where contrast isn't guaranteed; token names that don't parse as `family.option.state`.

## DS-5 — Labelled controls use `Field`, not ad-hoc label markup

**Rule:** A control with a caption above it (Select, Input, Slider, …) is wrapped in the shared **`Field`** component — `<Field label={…}>{control}</Field>` — not a hand-rolled `<div><label>…</label>{control}</div>`. `Field` owns the label↔control spacing, the label alignment, and the implicit label/control association (it renders a wrapping `<label>`).

**Why:** the label-above-control pattern recurred across settings as copy-pasted markup plus per-screen `.input-wrapper` CSS that drifted — different gaps, a stray `margin-bottom`, inconsistent alignment — and skipped the `<label>`↔control association. One component keeps spacing/alignment consistent, keeps the relationship accessible, and deletes the per-screen CSS.

**Watch for (review):** a `<label>` (or label-like `<div>`) immediately followed by a control inside a wrapper, or a new `.input-wrapper`-style rule — both should be a `Field`. Spacing the control itself owns (e.g. forcing it full-width) still lives at the call site.
