import { Button } from "@anori/components/Button";
import { Modal } from "@anori/components/Modal";
import { ScrollArea } from "@anori/components/ScrollArea";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useDirection } from "@radix-ui/react-direction";
import { AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { CustomIconsScreen } from "./screens/CustomIconsScreen";
import { FoldersScreen } from "./screens/FoldersScreen";
import { GeneralSettingsScreen } from "./screens/GeneralSettingsScreen";
import { HelpAboutScreen } from "./screens/HelpAboutScreen";
import { ImportExportScreen } from "./screens/ImportExportScreen";
import { MainScreen } from "./screens/MainScreen";
import { PluginsScreen } from "./screens/PluginsScreen";
import { ThemesScreen } from "./screens/ThemesScreen";
import { currentScreenAtom } from "./settings-atoms";
import "./Settings.scss";

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  console.log("Rendering SettingsModal");
  const { t } = useTranslation();
  const screenPrettyName = {
    main: t("settings.title"),
    general: t("settings.general.title"),
    "custom-icons": t("settings.customIcons.title"),
    folders: t("settings.folders.title"),
    plugins: t("settings.pluginSettings.title"),
    theme: t("settings.theme.title"),
    "import-export": t("settings.importExport.title"),
    "about-help": t("settings.aboutHelp.title"),
  } as const;

  const [screen, setScreen] = useAtom(currentScreenAtom);

  const dir = useDirection();

  const mainScreenEnter = { x: dir === "ltr" ? "-30%" : "30%", opacity: 0 };
  const mainScreenExit = { x: dir === "ltr" ? "-30%" : "30%", opacity: 0 };
  const innerScreenEnter = { x: dir === "ltr" ? "30%" : "-30%", opacity: 0 };
  const innerScreenExit = { x: dir === "ltr" ? "30%" : "-30%", opacity: 0 };
  const transition = { duration: 0.18 };

  return (
    <Modal
      title={screenPrettyName[screen]}
      className="SettingsModal"
      closable
      onClose={() => {
        onClose();
        setScreen("main");
      }}
      headerButton={
        screen !== "main" ? (
          <Button withoutBorder onClick={() => setScreen("main")}>
            <Icon icon={dir === "ltr" ? builtinIcons.arrowBack : builtinIcons.arrowForward} width={24} height={24} />
          </Button>
        ) : undefined
      }
    >
      <ScrollArea className="Settings">
        <div className="settings-content">
          <AnimatePresence initial={false} mode="wait">
            {screen === "main" && (
              <MainScreen
                key="main"
                initial={mainScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={mainScreenExit}
                transition={transition}
              />
            )}
            {screen === "general" && (
              <GeneralSettingsScreen
                key="general"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
            {screen === "custom-icons" && (
              <CustomIconsScreen
                key="custom-icons"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
            {screen === "folders" && (
              <FoldersScreen
                key="folders"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
            {screen === "plugins" && (
              <PluginsScreen
                key="plugins"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
            {screen === "theme" && (
              <ThemesScreen
                key="theme"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
            {screen === "import-export" && (
              <ImportExportScreen
                key="import-export"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
            {screen === "about-help" && (
              <HelpAboutScreen
                key="about-help"
                initial={innerScreenEnter}
                animate={{ x: 0, opacity: 1 }}
                exit={innerScreenExit}
                transition={transition}
              />
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </Modal>
  );
};

console.log("Settings modal loaded");
