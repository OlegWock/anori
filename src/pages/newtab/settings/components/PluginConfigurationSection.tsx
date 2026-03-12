import { usePluginConfig } from "@anori/utils/plugins/config";
import type { AnoriPlugin, PluginConfigurationScreenProps } from "@anori/utils/plugins/types";
import type { Mapping } from "@anori/utils/types";
import type { ComponentType } from "react";

export const PluginConfigurationSection = <T extends Mapping>({ plugin }: { plugin: AnoriPlugin<string, T> }) => {
  const [config, setConfig] = usePluginConfig(plugin);
  if (plugin.configurationScreen) {
    // TODO: repalace this type assertion with proper type guard
    const ConfigScreen = plugin.configurationScreen as ComponentType<PluginConfigurationScreenProps<T>>;
    return (
      <section>
        <h2>{plugin.name}</h2>
        <ConfigScreen currentConfig={config} saveConfiguration={setConfig} />
      </section>
    );
  }

  return null;
};
