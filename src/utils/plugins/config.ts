import type { SomePlugin } from "@anori/utils/plugins/types";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { SetStateAction } from "react";

// Plugins come from the registry config-erased, so the stored config reads back as `unknown`; the caller
// (the settings UI) hands it to the plugin's own configuration screen, which parses it. Inside a plugin's
// own code use the typed paths instead: the `pluginConfig` prop in widgets, `ctx.getConfig()` in behaviors.
export function usePluginConfig(
  plugin: SomePlugin,
): readonly [value: unknown, setValue: (val: SetStateAction<unknown>) => Promise<void>] {
  const query = anoriSchema.pluginConfig.config.byId(plugin.id);
  const [val, setVal, meta] = useStorageValue(query);

  const finalValue = meta.isDefault ? undefined : val;

  return [finalValue, setVal] as const;
}
