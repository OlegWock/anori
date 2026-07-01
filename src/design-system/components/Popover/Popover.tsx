import { createLazyComponent } from "@anori/utils/lazy-component";
import type { PopoverProps, PopoverRenderProps } from "./PopoverImpl";

export type { PopoverProps, PopoverRenderProps };

// Keep the trigger rendered while the chunk loads, then swap in the real popover.
const PopoverFallback = (props: PopoverProps<unknown>) => <>{props.children}</>;

export const Popover = createLazyComponent(() => import("./PopoverImpl").then((m) => m.PopoverImpl), {
  fallback: PopoverFallback,
});
