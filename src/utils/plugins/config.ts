import type { SomePlugin } from "@anori/utils/plugins/types";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { SetStateAction } from "react";

export function usePluginConfig(
  plugin: SomePlugin,
): readonly [value: unknown, setValue: (val: SetStateAction<unknown>) => Promise<void>] {
  const query = anoriSchema.pluginConfig.config.byId(plugin.id);
  const [val, setVal, meta] = useStorageValue(query);

  const finalValue = meta.isDefault ? undefined : val;

  return [finalValue, setVal as (val: SetStateAction<unknown>) => Promise<void>] as const;
}
