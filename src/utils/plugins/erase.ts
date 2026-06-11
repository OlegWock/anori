import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import type { ID } from "@anori/utils/types";

// Erase a concrete plugin/widget's config types at the registry boundary. The generics are constrained
// only on config-INDEPENDENT fields, so any concrete plugin/widget is accepted without TS checking the
// contravariant config-screen positions — that's what avoids the variance error (no `any` needed). The
// lone `as unknown as` is the precise -> erased bridge; it trusts that stored config matches the widget,
// exactly as the previous `config as SomeConfig` casts did. Swap it for a per-widget schema `parse` here
// if/when we want the stored config validated at this seam.
type PluginLike = { id: ID; name: string; icon: string; widgets: readonly { id: ID }[] };
type WidgetLike = { id: ID };

export const erasePlugin = <P extends PluginLike>(plugin: P): SomePlugin => plugin as unknown as SomePlugin;
export const eraseWidget = <W extends WidgetLike>(widget: W): SomeWidget => widget as unknown as SomeWidget;
