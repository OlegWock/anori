import { createLazyComponent } from "@anori/utils/lazy-component";
import type { ComponentType } from "react";
import type { SelectImpl, SelectProps } from "./SelectImpl";

export type { SelectProps };

export const Select = createLazyComponent(() =>
  import("./SelectImpl").then((m) => m.SelectImpl as ComponentType<SelectProps<unknown>>),
) as typeof SelectImpl & { preload: () => Promise<unknown> };
