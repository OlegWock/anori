import { usePluginConfig } from "@anori/utils/plugins/config";
import type { SomePlugin } from "@anori/utils/plugins/types";
import { useMemo } from "react";

export const PluginConfigurationSection = ({ plugin }: { plugin: SomePlugin }) => {
  const [config, setConfig] = usePluginConfig(plugin);
  const currentConfig = useMemo(() => {
    if (config === undefined) return undefined;
    try {
      return plugin.decodeConfig(config);
    } catch (e) {
      console.error(`Failed to decode plugin config for "${plugin.id}"`, e);
      return undefined;
    }
  }, [plugin, config]);
  if (plugin.configurationScreen) {
    const ConfigScreen = plugin.configurationScreen;
    const saveConfiguration = (value: unknown) => {
      try {
        setConfig(plugin.encodeConfig(value));
      } catch (e) {
        console.error(`Failed to save plugin config for "${plugin.id}"`, e);
      }
    };
    return (
      <section>
        <h2>{plugin.name}</h2>
        <ConfigScreen currentConfig={currentConfig} saveConfiguration={saveConfiguration} />
      </section>
    );
  }

  return null;
};
