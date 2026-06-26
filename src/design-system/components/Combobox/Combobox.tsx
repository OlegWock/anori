import { Input } from "@anori/design-system/components/Input/Input";
import { createLazyComponent } from "@anori/utils/lazy-component";
import type { ComponentType } from "react";
import type { ComboboxImpl, ComboboxProps } from "./ComboboxImpl";

export type { ComboboxProps };

// While the chunk loads, show a read-only input with the current value so the field doesn't jump.
const ComboboxFallback = <T,>({ getOptionLabel, value, placeholder, className }: ComboboxProps<T>) => (
  <Input value={getOptionLabel(value)} placeholder={placeholder} className={className} readOnly />
);

export const Combobox = createLazyComponent(
  () => import("./ComboboxImpl").then((m) => m.ComboboxImpl as ComponentType<ComboboxProps<unknown>>),
  { fallback: ComboboxFallback as ComponentType<ComboboxProps<unknown>> },
) as typeof ComboboxImpl & { preload: () => Promise<unknown> };
