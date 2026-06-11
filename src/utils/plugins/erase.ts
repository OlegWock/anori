import type { SomeWidget } from "@anori/utils/plugins/types";
import type { ID } from "@anori/utils/types";

// Erase a concrete widget descriptor's config types at the registry boundary. The generic is constrained
// only on the config-INDEPENDENT `id`, so any concrete widget is accepted without TS checking the
// contravariant config-screen position — that's what avoids the variance error (no `any` needed). The
// lone `as unknown as` is the precise -> erased bridge; it trusts that stored config matches the widget.
// Swap it for a per-widget schema `parse` here if/when we want the stored config validated at this seam.
// (Plugins need no equivalent helper: `definePlugin().build()` already produces a `SomePlugin`.)
type WidgetLike = { id: ID };

export const eraseWidget = <W extends WidgetLike>(widget: W): SomeWidget => widget as unknown as SomeWidget;
