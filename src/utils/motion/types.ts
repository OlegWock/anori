import type { Variant } from "motion/react";

export type NarrowVariants<T extends string> = {
  [key in T]?: Variant;
};
