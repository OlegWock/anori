import { migrateStorage } from "@anori/utils/storage-legacy/migrations";
import { useFolders } from "@anori/utils/user-data/hooks";
import browser from "webextension-polyfill";
import "./Settings.scss";
import vtuberLogo from "@anori/assets/images/vtuber-logo-dark.svg";
import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { CheckboxWithPermission } from "@anori/components/CheckboxWithPermission";
import { Hint } from "@anori/components/Hint";
import { Input } from "@anori/components/Input";
import { Modal } from "@anori/components/Modal";
import { ScrollArea } from "@anori/components/ScrollArea";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { Tooltip } from "@anori/components/Tooltip";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { deleteAllCustomIcons, isValidCustomIconName, useCustomIcons } from "@anori/components/icon/custom-icons";
import { ReorderGroup, Select } from "@anori/components/lazy-components";
import { availablePlugins } from "@anori/plugins/all";
import { type Language, availableTranslations, availableTranslationsPrettyNames } from "@anori/translations/metadata";
import { switchTranslationLanguage } from "@anori/translations/utils";
import { trackEvent } from "@anori/utils/analytics";
import { useScreenWidth } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import { downloadBlob, showOpenFilePicker } from "@anori/utils/files";
import { guid } from "@anori/utils/misc";
import { setPageTitle } from "@anori/utils/page";
import { usePluginConfig } from "@anori/utils/plugins/config";
import type { AnoriPlugin, PluginConfigurationScreenProps } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage, useWritableStorageValue } from "@anori/utils/storage";
import type { Mapping } from "@anori/utils/types";
import { deleteAllThemeBackgrounds, saveThemeBackground } from "@anori/utils/user-data/theme";
import { homeFolder } from "@anori/utils/user-data/types";
import { useDirection } from "@radix-ui/react-direction";
import { AnimatePresence, LayoutGroup, m } from "framer-motion";
import { atom, useAtom, useSetAtom } from "jotai";
import JSZip from "jszip";
import moment from "moment-timezone";
import { type ComponentProps, type ComponentType, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { FolderItem } from "./FolderItem";
import { License } from "./License";
import { ThemesScreen } from "./ThemesScreen";

type DraftCustomIcon = {
  id: string;
  name: string;
  extension: string;
  content: ArrayBuffer;
  preview: string;
};

type SettingScreen =
  | "main"
  | "general"
  | "custom-icons"
  | "folders"
  | "plugins"
  | "theme"
  | "import-export"
  | "about-help";
const currentScreenAtom = atom<SettingScreen>("main");

const ScreenButton = ({ icon, name, ...props }: { icon: string; name: string } & ComponentProps<"button">) => {
  return (
    <button className="ScreenButton" {...props}>
      <Icon icon={icon} width={48} height={48} className="icon" />
      <span>{name}</span>
    </button>
  );
};

const MainScreen = (props: ComponentProps<typeof m.div>) => {
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

const PluginConfigurationSection = <T extends Mapping>({ plugin }: { plugin: AnoriPlugin<string, T> }) => {
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

const GeneralSettingsScreen = (props: ComponentProps<typeof m.div>) => {
  const def = anoriSchema.latestSchema.definition;
  const [language, setLanguage] = useWritableStorageValue(def.language);
  const [isAutomaticCompact, setAutomaticCompact] = useWritableStorageValue(def.automaticCompactMode);
  const [automaticCompactModeThreshold, setAutomaticCompactModeThreshold] = useWritableStorageValue(
    def.automaticCompactModeThreshold,
  );
  const [manualCompactMode, setManualCompactMode] = useWritableStorageValue(def.compactMode);
  const [showLoadAnimation, setShowLoadAnimation] = useWritableStorageValue(def.showLoadAnimation);
  const [rememberLastFolder, setRememberLastFolder] = useWritableStorageValue(def.rememberLastFolder);
  const [showBookmarksBar, setShowBookmarksBar] = useWritableStorageValue(def.showBookmarksBar);
  const [newTabTitle, setNewTabTitle] = useWritableStorageValue(def.newTabTitle);
  const [sidebarOrientation, setSidebarOrientation] = useWritableStorageValue(def.sidebarOrientation);
  const [autoHideSidebar, setAutoHideSidebar] = useWritableStorageValue(def.autoHideSidebar);
  const [analyticsEnabled, setAnalyticsEnabled] = useWritableStorageValue(def.analyticsEnabled);
  const [, setLastFolder] = useWritableStorageValue(def.lastFolder);
  const screenWidth = useScreenWidth();
  const { t } = useTranslation();

  const screenSizeBreakpoints = useMemo(
    () => [
      500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400,
      2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000,
    ],
    [],
  );

  useEffect(() => {
    setPageTitle(newTabTitle ?? "Anori");
  }, [newTabTitle]);

  return (
    <m.div {...props} className="GeneralSettingsScreen">
      <div className="input-wrapper">
        <label>{t("settings.general.language")}:</label>
        <Select<Language>
          value={language ?? "en"}
          onChange={(newLang) => {
            console.log("Saving new language", newLang);
            setLanguage(newLang);
            switchTranslationLanguage(newLang);
          }}
          options={[...availableTranslations]}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => availableTranslationsPrettyNames[o]}
        />

        <Alert level="info" className="translation-alert">
          <Trans t={t} i18nKey="settings.general.translationInfo">
            {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
            <a href="https://github.com/OlegWock/anori/issues/104" />
          </Trans>
        </Alert>
      </div>
      <div className="input-wrapper">
        <label>{t("settings.general.sidebarOrientation")}:</label>
        <Select<"auto" | "vertical" | "horizontal">
          value={sidebarOrientation ?? "auto"}
          onChange={setSidebarOrientation}
          options={["auto", "vertical", "horizontal"]}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => t(`settings.general.sidebarOrientationOption-${o}`)}
        />
      </div>
      <div className="input-wrapper">
        <label>{t("settings.general.newTabTitle")}: </label>
        <Input value={newTabTitle ?? ""} onValueChange={setNewTabTitle} />
      </div>

      <Checkbox checked={analyticsEnabled ?? false} onChange={setAnalyticsEnabled}>
        {t("settings.general.enableAnalytics")}
        <Hint
          hasClickableContent
          content={
            <>
              <div>{t("settings.general.analyticsHintP1")}</div>

              <div style={{ marginTop: "0.5rem" }}>
                <Trans t={t} i18nKey="settings.general.analyticsHintP2">
                  {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
                  <a href="https://anori.app/privacy#analytics" target="_blank" rel="noreferrer" />
                </Trans>
              </div>
            </>
          }
        />
      </Checkbox>

      <Checkbox
        checked={rememberLastFolder ?? false}
        onChange={(v) => {
          setRememberLastFolder(v);
          if (!v) setLastFolder(undefined);
        }}
      >
        {t("settings.general.rememberLastFolder")}
      </Checkbox>

      <Checkbox checked={autoHideSidebar ?? false} onChange={setAutoHideSidebar}>
        {t("settings.general.autoHideSidebar")}
      </Checkbox>

      {/* In Firefox, we can't get favicon https://bugzilla.mozilla.org/show_bug.cgi?id=1315616 */}
      {X_BROWSER === "chrome" && (
        <CheckboxWithPermission
          permissions={["bookmarks", "favicon"]}
          onChange={setShowBookmarksBar}
          checked={showBookmarksBar}
        >
          {t("settings.general.showBookmarksBar")}
        </CheckboxWithPermission>
      )}

      <Checkbox
        checked={manualCompactMode ?? IS_TOUCH_DEVICE}
        onChange={setManualCompactMode}
        disabled={isAutomaticCompact ?? !IS_TOUCH_DEVICE}
      >
        {t("settings.general.useCompact")}
      </Checkbox>
      <Checkbox checked={isAutomaticCompact ?? !IS_TOUCH_DEVICE} onChange={setAutomaticCompact}>
        {t("settings.general.automaticCompact")}
      </Checkbox>
      {(isAutomaticCompact ?? !IS_TOUCH_DEVICE) && (
        <div>
          <label>{t("settings.general.automaticCompactModeThreshold")}</label>
          <Select<number>
            options={screenSizeBreakpoints}
            getOptionKey={(o) => o.toString()}
            getOptionLabel={(o) => `< ${o}${t("px")}`}
            value={automaticCompactModeThreshold ?? 1500}
            onChange={setAutomaticCompactModeThreshold}
          />
          <div className="screen-size-hint">
            {t("settings.general.automaticCompactModeThresholdHint", { screenWidth: screenWidth })}
          </div>
        </div>
      )}
      <Checkbox checked={showLoadAnimation ?? false} onChange={setShowLoadAnimation}>
        {t("settings.general.showAnimationOnOpen")}
        <Hint content={t("settings.general.showAnimationOnOpenHint")} />
      </Checkbox>
    </m.div>
  );
};

const CustomIconsScreen = (props: ComponentProps<typeof m.div>) => {
  const importCustomIcons = async () => {
    const files = await showOpenFilePicker(true, ".jpg,.jpeg,.png,.gif,.svg");
    let hasErrors = false;
    const importedFiles: DraftCustomIcon[] = await Promise.all(
      files.map(async (file) => {
        const id = guid();
        const arrayBuffer = await file.arrayBuffer();
        const preview = URL.createObjectURL(file);
        const tokens = file.name.split(".");
        const extension = tokens[tokens.length - 1];
        const name = tokens.slice(0, tokens.length - 1).join(".");
        if (!name || !extension || !["png", "jpg", "jpeg", "svg"].includes(extension.toLowerCase())) {
          hasErrors = true;
        }

        return {
          id,
          content: arrayBuffer,
          name,
          extension,
          preview,
        };
      }),
    );

    if (hasErrors) {
      // TODO: replace with toast
      alert(t("settings.customIcons.incorrectFormat"));
      return;
    }
    setDraftCustomIcons((p) => [...p, ...importedFiles]);
  };

  const saveDraftCustomIcons = async () => {
    await Promise.all(
      draftCustomIcons.map((draftCustomIcon) =>
        addNewCustomIcon(
          `${draftCustomIcon.name}.${draftCustomIcon.extension}`,
          draftCustomIcon.content,
          draftCustomIcon.preview,
        ),
      ),
    );
    setDraftCustomIcons([]);
  };

  const { t } = useTranslation();
  const { customIcons, addNewCustomIcon, removeCustomIcon } = useCustomIcons();
  const [draftCustomIcons, setDraftCustomIcons] = useState<DraftCustomIcon[]>([]);
  const hasDraftIconsWithInvalidName = draftCustomIcons.some((i) => !isValidCustomIconName(i.name));

  return (
    <m.div {...props} className="CustomIconsScreen">
      {customIcons.length === 0 && <div className="no-custom-icons-alert">{t("settings.customIcons.noIcons")}</div>}

      <m.div className="custom-icons-grid" layout>
        <LayoutGroup>
          <AnimatePresence initial={false} mode="sync">
            {customIcons.map((icon) => {
              return (
                <m.div
                  key={icon.name}
                  layout
                  layoutId={icon.name}
                  className="custom-icon-plate"
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Icon icon={`custom:${icon.name}`} height={32} width={32} />
                  <div className="custom-icon-name">{icon.name}</div>
                  <Button onClick={() => removeCustomIcon(icon.name)}>
                    <Icon icon={builtinIcons.close} height={22} />
                  </Button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
      </m.div>

      {draftCustomIcons.length !== 0 && (
        <m.div className="draft-icons-list" layout layoutRoot>
          {draftCustomIcons.map((draftCustomIcon) => {
            const validName = isValidCustomIconName(draftCustomIcon.name) || draftCustomIcon.name.length === 0;
            return (
              <m.div
                layout="position"
                layoutId={draftCustomIcon.id}
                className="draft-icon-section"
                key={draftCustomIcon.id}
                initial={{ translateY: "10%", opacity: 0 }}
                animate={{ translateY: "0%", opacity: 1 }}
              >
                <img
                  height={64}
                  width={64}
                  className="draft-icon-preview"
                  src={draftCustomIcon.preview}
                  alt={draftCustomIcon.name}
                />
                <div className="draft-icon-name-wrapper">
                  <Input
                    className="draft-icon-name"
                    placeholder={t("settings.customIcons.iconName")}
                    value={draftCustomIcon.name}
                    onValueChange={(name) =>
                      setDraftCustomIcons((p) => p.map((i) => (i.id === draftCustomIcon.id ? { ...i, name } : i)))
                    }
                  />
                  {!validName && (
                    <div className="draft-icon-name-error">{t("settings.customIcons.nameContainsInvalidChars")}</div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setDraftCustomIcons((p) => p.filter((i) => i.id !== draftCustomIcon.id));
                    URL.revokeObjectURL(draftCustomIcon.preview);
                  }}
                >
                  <Icon icon={builtinIcons.close} height={22} />
                </Button>
              </m.div>
            );
          })}

          {hasDraftIconsWithInvalidName && (
            <Tooltip placement="top" label={t("settings.customIcons.invalidNames")} enableOnTouch>
              <Button visuallyDisabled>{t("settings.customIcons.saveIcons")}</Button>
            </Tooltip>
          )}
          {!hasDraftIconsWithInvalidName && (
            <Button onClick={saveDraftCustomIcons}>{t("settings.customIcons.saveIcons")}</Button>
          )}
        </m.div>
      )}

      {draftCustomIcons.length === 0 && (
        <Tooltip label={t("settings.customIcons.supportedFormats")} maxWidth={500} placement="top" enableOnTouch>
          <Button onClick={importCustomIcons}>{t("settings.customIcons.importIcons")}</Button>
        </Tooltip>
      )}
    </m.div>
  );
};

const FoldersScreen = (props: ComponentProps<typeof m.div>) => {
  const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
  const { t } = useTranslation();

  return (
    <m.div {...props} className="FoldersScreen">
      <m.div>
        <FolderItem folder={homeFolder} />
        <ReorderGroup axis="y" values={folders} onReorder={setFolders} as="div">
          {folders.map((f, _index) => {
            return (
              <FolderItem
                key={f.id}
                folder={f}
                editable
                onNameChange={(name) => updateFolder(f.id, { name })}
                onIconChange={(icon) => updateFolder(f.id, { icon })}
                onRemove={() => removeFolder(f.id)}
              />
            );
          })}
        </ReorderGroup>
      </m.div>

      <Button className="add-folder-btn" onClick={() => createFolder()}>
        <Icon icon={builtinIcons.add} height={24} /> {t("settings.folders.createNew")}
      </Button>
    </m.div>
  );
};

const PluginsScreen = (props: ComponentProps<typeof m.div>) => {
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

const ImportExportScreen = (props: ComponentProps<typeof m.div>) => {
  const exportSettings = async () => {
    const zip = new JSZip();
    const rawStorage = await browser.storage.local.get(null);
    zip.file("storage.json", JSON.stringify(rawStorage, null, 4), { compression: "DEFLATE" });
    zip.file(
      "meta.json",
      JSON.stringify(
        {
          extensionVersion: browser.runtime.getManifest().version,
          storageFormat: "v2", // New format indicator
          date: moment().toString(),
        },
        null,
        4,
      ),
      { compression: "DEFLATE" },
    );

    // Export custom icons from new storage
    const storage = await getAnoriStorage();
    const customIcons = await storage.files.get(anoriSchema.latestSchema.definition.customIcons.all());
    for (const [name, { blob }] of Object.entries(customIcons)) {
      zip.file(`files/custom-icons/${name}`, blob, { compression: "DEFLATE" });
    }

    // Export theme backgrounds from new storage
    const themeBackgrounds = await storage.files.get(anoriSchema.latestSchema.definition.themeBackgrounds.all());
    for (const [key, { blob, meta }] of Object.entries(themeBackgrounds)) {
      const filename = `${meta.properties?.themeName ?? key}-${meta.properties?.variant ?? "blurred"}`;
      zip.file(`files/theme-backgrounds/${filename}`, blob, { compression: "DEFLATE" });
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const datetime = moment().format("yyyy-MM-DD_HH-mm");
    downloadBlob(`anori-backup-${datetime}.zip`, zipBlob);
    trackEvent("Configuration exported");
  };

  const importSettings = async () => {
    const files = await showOpenFilePicker(false, ".zip");
    const file = files[0];
    const zip = await JSZip.loadAsync(file);
    const storageJsonFile = zip.file("storage.json");
    if (!storageJsonFile) {
      throw new Error(`couldn't find storage.json in backup`);
    }
    const storageJsonString = await storageJsonFile.async("string");
    const storageContent = JSON.parse(storageJsonString);
    const { storage: migratedStorage } = migrateStorage(storageContent);
    await browser.storage.local.clear();
    await browser.storage.local.set(migratedStorage);

    await deleteAllCustomIcons();
    await deleteAllThemeBackgrounds();

    const promises: Promise<void>[] = [];

    // Check for new format (files/ folder) or legacy format (opfs/ folder)
    const hasNewFormat = zip.folder("files")?.file(/./).length;

    if (hasNewFormat) {
      // New format: files/custom-icons/ and files/theme-backgrounds/
      zip.folder("files/custom-icons")?.forEach((path, zipFile) => {
        console.log("Importing custom icon", { path });
        promises.push(
          zipFile.async("arraybuffer").then((ab) => {
            return addNewCustomIcon(path, ab);
          }),
        );
      });

      zip.folder("files/theme-backgrounds")?.forEach((path, zipFile) => {
        console.log("Importing theme background", { path });
        // Parse filename: {themeName}-{variant}
        const match = path.match(/^(.+)-(original|blurred)$/);
        if (match) {
          const [, themeName, variant] = match;
          promises.push(
            zipFile.async("arraybuffer").then((ab) => {
              return saveThemeBackground(themeName, variant as "original" | "blurred", ab);
            }),
          );
        }
      });
    } else {
      // Legacy format: opfs/custom-icons/ and opfs/custom-themes/
      zip.folder("opfs/custom-icons")?.forEach((path, zipFile) => {
        console.log("Importing legacy custom icon", { path });
        promises.push(
          zipFile.async("arraybuffer").then((ab) => {
            return addNewCustomIcon(path, ab);
          }),
        );
      });

      zip.folder("opfs/custom-themes")?.forEach((path, zipFile) => {
        console.log("Importing legacy theme background", { path });
        // Parse legacy filename: {themeName}-original or {themeName}-blurred
        const match = path.match(/^(.+)-(original|blurred)$/);
        if (match) {
          const [, themeName, variant] = match;
          promises.push(
            zipFile.async("arraybuffer").then((ab) => {
              return saveThemeBackground(themeName, variant as "original" | "blurred", ab);
            }),
          );
        }
      });
    }

    await Promise.all(promises);
    await trackEvent("Configuration imported");
    window.location.reload();
  };

  const { t } = useTranslation();

  const { addNewCustomIcon } = useCustomIcons();

  return (
    <m.div {...props} className="ImportExportScreen">
      <div>{t("settings.importExport.info")}</div>
      <div className="import-export-button">
        <Button onClick={importSettings}>{t("settings.importExport.import")}</Button>
        <Button onClick={exportSettings}>{t("settings.importExport.export")}</Button>
      </div>
    </m.div>
  );
};

const HelpAboutScreen = (props: ComponentProps<typeof m.div>) => {
  const { t, i18n } = useTranslation();
  return (
    <m.div {...props} className="HelpAboutScreen">
      <img src={vtuberLogo} alt="Anori logo" className="logo" />
      <p>
        <Trans t={t} i18nKey="settings.aboutHelp.p1">
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://github.com/OlegWock/anori" />
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://github.com/OlegWock/anori/issues/new" />
        </Trans>
      </p>

      {i18n.language !== "en" && <p>{t("settings.aboutHelp.onlyEnglishPlease")}</p>}

      <p>
        <Trans t={t} i18nKey="settings.aboutHelp.p4">
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://sinja.io/support" />
        </Trans>
      </p>

      <p>
        <Trans t={t} i18nKey="settings.aboutHelp.p2">
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://github.com/OlegWock/anori" />
        </Trans>
      </p>

      <p>
        <Trans t={t} i18nKey="settings.aboutHelp.p3">
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://twitter.com/OlegWock" />
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://stand-with-ukraine.pp.ua/" />
        </Trans>
      </p>

      <section className="shortcuts-section">
        <h2>{t("shortcuts.title")}</h2>
        <ShortcutsHelp />
      </section>

      <section>
        <h2>{t("settings.aboutHelp.license")}</h2>
        <License />
      </section>
    </m.div>
  );
};

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
