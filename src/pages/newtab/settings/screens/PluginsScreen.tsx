import { Heading } from "@anori/design-system/components/Heading/Heading";
import { availablePlugins } from "@anori/plugins/all";
import { m } from "motion/react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { PluginConfigurationSection } from "../components/PluginConfigurationSection";

const screen = css({
  display: "flex",
  flexDirection: "column",
  gap: "6",
  "& section": { display: "flex", flexDirection: "column", alignItems: "stretch" },
});

export const PluginsScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  return (
    <m.div {...props} className={screen}>
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
