import { Input } from "@anori/design-system/components/Input/Input";
import { createLazyComponent } from "@anori/utils/lazy-component";
import type { ComboboxProps } from "./ComboboxImpl";

export type { ComboboxProps };

// While the chunk loads, show a read-only input with the current value so the field doesn't jump.
const ComboboxFallback = <T,>({ getOptionLabel, value, placeholder, className }: ComboboxProps<T>) => (
  <Input value={getOptionLabel(value)} placeholder={placeholder} className={className} readOnly />
);

export const Combobox = createLazyComponent(() => import("./ComboboxImpl").then((m) => m.ComboboxImpl), {
  fallback: ComboboxFallback,
});
