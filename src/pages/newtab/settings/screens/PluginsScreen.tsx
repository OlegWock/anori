import { Heading } from "@anori/design-system/components/Heading/Heading";
import { availablePlugins } from "@anori/plugins/all";
import { m } from "framer-motion";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { PluginConfigurationSection } from "../components/PluginConfigurationSection";
import "./PluginsScreen.scss";

export const PluginsScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  return (
    <m.div {...props} className="PluginsScreen">
      <Heading level={2} size={1}>
        {t("settings.pluginSettings.title")}
      </Heading>
      {availablePlugins
        .filter((p) => p.configurationScreen !== null)
        .map((p) => {
          return <PluginConfigurationSection plugin={p} key={p.id} />;
        })}
    </m.div>
  );
};
