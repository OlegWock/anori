import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { availablePlugins } from "@anori/plugins/all";
import type { m } from "framer-motion";
import type { ComponentProps, ComponentType } from "react";
import { CustomIconsScreen } from "./screens/CustomIconsScreen";
import { FoldersScreen } from "./screens/FoldersScreen";
import { GeneralSettingsScreen } from "./screens/GeneralSettingsScreen";
import { HelpAboutScreen } from "./screens/HelpAboutScreen";
import { ImportExportScreen } from "./screens/ImportExportScreen";
import { PluginsScreen } from "./screens/PluginsScreen";
import { ThemesScreen } from "./screens/ThemesScreen";
import type { SettingScreen } from "./settings-atoms";

export type SettingsSection = {
  id: SettingScreen;
  icon: string;
  titleKey: string;
  // Each screen renders into an animated container, so it takes motion-div props.
  Component: ComponentType<ComponentProps<typeof m.div>>;
};

const hasPluginsWithSettings = availablePlugins.some((p) => p.configurationScreen !== null);

// The sidebar order also drives the slide direction when switching (down = later, up = earlier).
export const settingsSections: SettingsSection[] = [
  { id: "general", icon: builtinIcons.settings, titleKey: "settings.general.title", Component: GeneralSettingsScreen },
  {
    id: "custom-icons",
    icon: builtinIcons.fileTray,
    titleKey: "settings.customIcons.title",
    Component: CustomIconsScreen,
  },
  { id: "folders", icon: builtinIcons.folder, titleKey: "settings.folders.title", Component: FoldersScreen },
  ...(hasPluginsWithSettings
    ? [
        {
          id: "plugins",
          icon: builtinIcons.code,
          titleKey: "settings.pluginSettings.title",
          Component: PluginsScreen,
        } satisfies SettingsSection,
      ]
    : []),
  { id: "theme", icon: builtinIcons.palette, titleKey: "settings.theme.title", Component: ThemesScreen },
  {
    id: "import-export",
    icon: builtinIcons.archive,
    titleKey: "settings.importExport.title",
    Component: ImportExportScreen,
  },
  { id: "about-help", icon: builtinIcons.helpBuoy, titleKey: "settings.aboutHelp.title", Component: HelpAboutScreen },
];
