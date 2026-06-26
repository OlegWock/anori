import { createLazyComponent } from "@anori/utils/lazy-component";
import type { ComponentType } from "react";
import type { PopoverImpl, PopoverProps, PopoverRenderProps } from "./PopoverImpl";

export type { PopoverProps, PopoverRenderProps };

// Keep the trigger rendered while the chunk loads, then swap in the real popover.
const PopoverFallback = (props: PopoverProps<unknown>) => <>{props.children}</>;

export const Popover = createLazyComponent(
  () => import("./PopoverImpl").then((m) => m.PopoverImpl as ComponentType<PopoverProps<unknown>>),
  { fallback: PopoverFallback },
) as typeof PopoverImpl & { preload: () => Promise<unknown> };
