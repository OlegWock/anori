import type { Variant } from "framer-motion";

export type NarrowVariants<T extends string> = {
  [key in T]?: Variant;
};
