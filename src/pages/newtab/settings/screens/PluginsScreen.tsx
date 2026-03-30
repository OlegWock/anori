import { availablePlugins } from "@anori/plugins/all";
import { m } from "framer-motion";
import type { ComponentProps } from "react";
import { PluginConfigurationSection } from "../components/PluginConfigurationSection";
import "./PluginsScreen.scss";

export const PluginsScreen = (props: ComponentProps<typeof m.div>) => {
  return (
    <m.div {...props} className="PluginsScreen">
      {availablePlugins
        .filter((p) => p.configurationScreen !== null)
        .map((p) => {
          return <PluginConfigurationSection plugin={p} key={p.id} />;
        })}
    </m.div>
  );
};
