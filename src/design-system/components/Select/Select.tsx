import { createLazyComponent } from "@anori/utils/lazy-component";
import type { SelectProps } from "./SelectImpl";

export type { SelectProps };

export const Select = createLazyComponent(() => import("./SelectImpl").then((m) => m.SelectImpl));
