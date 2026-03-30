import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { availablePlugins } from "@anori/plugins/all";
import { m } from "framer-motion";
import { useSetAtom } from "jotai";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ScreenButton } from "../components/ScreenButton";
import { currentScreenAtom } from "../settings-atoms";
import "./MainScreen.scss";

export const MainScreen = (props: ComponentProps<typeof m.div>) => {
  const setScreen = useSetAtom(currentScreenAtom);
  const { t } = useTranslation();
  const hasPluginsWithSettings = availablePlugins.filter((p) => p.configurationScreen !== null).length !== 0;

  return (
    <m.div {...props} className="MainSettingsScreen">
      <ScreenButton
        onClick={() => setScreen("general")}
        icon={builtinIcons.settings}
        name={t("settings.general.title")}
      />
      <ScreenButton
        onClick={() => setScreen("custom-icons")}
        icon={builtinIcons.fileTray}
        name={t("settings.customIcons.title")}
      />
      <ScreenButton
        onClick={() => setScreen("folders")}
        icon={builtinIcons.folder}
        name={t("settings.folders.title")}
      />
      {hasPluginsWithSettings && (
        <ScreenButton
          onClick={() => setScreen("plugins")}
          icon={builtinIcons.code}
          name={t("settings.pluginSettings.title")}
        />
      )}
      <ScreenButton onClick={() => setScreen("theme")} icon={builtinIcons.palette} name={t("settings.theme.title")} />
      <ScreenButton
        onClick={() => setScreen("import-export")}
        icon={builtinIcons.archive}
        name={t("settings.importExport.title")}
      />
      <ScreenButton
        onClick={() => setScreen("about-help")}
        icon={builtinIcons.helpBuoy}
        name={t("settings.aboutHelp.title")}
      />
    </m.div>
  );
};
