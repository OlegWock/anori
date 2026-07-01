import type { SomeWidget } from "@anori/utils/plugins/types";
import type { ID } from "@anori/utils/types";

type WidgetLike = { id: ID };

export const eraseWidget = <W extends WidgetLike>(widget: W): SomeWidget => widget as unknown as SomeWidget;
