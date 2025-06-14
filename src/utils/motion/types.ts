import type { Variant, animate } from "framer-motion";

export type AnimateFunction<V extends {}> = typeof animate<V>;
export type AnimationOptions<V extends {}> = Parameters<AnimateFunction<V>>;

export type NarrowVariants<T extends string> = {
  [key in T]?: Variant;
};
