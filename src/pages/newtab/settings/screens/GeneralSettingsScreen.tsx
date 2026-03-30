import { Alert } from "@anori/components/Alert";
import { Checkbox } from "@anori/components/Checkbox";
import { CheckboxWithPermission } from "@anori/components/CheckboxWithPermission";
import { Hint } from "@anori/components/Hint";
import { Input } from "@anori/components/Input";
import { Select } from "@anori/components/lazy-components";
import { type Language, availableTranslations, availableTranslationsPrettyNames } from "@anori/translations/metadata";
import { switchTranslationLanguage } from "@anori/translations/utils";
import { useScreenWidth } from "@anori/utils/compact";
import { setPageTitle } from "@anori/utils/page";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import { m } from "framer-motion";
import { type ComponentProps, useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import "./GeneralSettingsScreen.scss";

export const GeneralSettingsScreen = (props: ComponentProps<typeof m.div>) => {
  const [language, setLanguage] = useStorageValue(anoriSchema.language);
  const [isAutomaticCompact, setAutomaticCompact] = useStorageValue(anoriSchema.automaticCompactMode);
  const [automaticCompactModeThreshold, setAutomaticCompactModeThreshold] = useStorageValue(
    anoriSchema.automaticCompactModeThreshold,
  );
  const [manualCompactMode, setManualCompactMode] = useStorageValue(anoriSchema.compactMode);
  const [showLoadAnimation, setShowLoadAnimation] = useStorageValue(anoriSchema.showLoadAnimation);
  const [rememberLastFolder, setRememberLastFolder] = useStorageValue(anoriSchema.rememberLastFolder);
  const [showBookmarksBar, setShowBookmarksBar] = useStorageValue(anoriSchema.showBookmarksBar);
  const [newTabTitle, setNewTabTitle] = useStorageValue(anoriSchema.newTabTitle);
  const [sidebarOrientation, setSidebarOrientation] = useStorageValue(anoriSchema.sidebarOrientation);
  const [autoHideSidebar, setAutoHideSidebar] = useStorageValue(anoriSchema.autoHideSidebar);
  const [analyticsEnabled, setAnalyticsEnabled] = useStorageValue(anoriSchema.analyticsEnabled);
  const [, setLastFolder] = useStorageValue(anoriSchema.lastFolder);
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
    setPageTitle(newTabTitle);
  }, [newTabTitle]);

  return (
    <m.div {...props} className="GeneralSettingsScreen">
      <div className="input-wrapper">
        <label>{t("settings.general.language")}:</label>
        <Select<Language>
          value={language}
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
          value={sidebarOrientation}
          onChange={setSidebarOrientation}
          options={["auto", "vertical", "horizontal"]}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => t(`settings.general.sidebarOrientationOption-${o}`)}
        />
      </div>
      <div className="input-wrapper">
        <label>{t("settings.general.newTabTitle")}: </label>
        <Input value={newTabTitle} onValueChange={setNewTabTitle} />
      </div>

      <Checkbox checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
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
        checked={rememberLastFolder}
        onChange={(v) => {
          setRememberLastFolder(v);
          if (!v) setLastFolder(undefined);
        }}
      >
        {t("settings.general.rememberLastFolder")}
      </Checkbox>

      <Checkbox checked={autoHideSidebar} onChange={setAutoHideSidebar}>
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

      <Checkbox checked={manualCompactMode} onChange={setManualCompactMode} disabled={isAutomaticCompact}>
        {t("settings.general.useCompact")}
      </Checkbox>
      <Checkbox checked={isAutomaticCompact} onChange={setAutomaticCompact}>
        {t("settings.general.automaticCompact")}
      </Checkbox>
      {isAutomaticCompact && (
        <div>
          <label>{t("settings.general.automaticCompactModeThreshold")}</label>
          <Select<number>
            options={screenSizeBreakpoints}
            getOptionKey={(o) => o.toString()}
            getOptionLabel={(o) => `< ${o}${t("px")}`}
            value={automaticCompactModeThreshold}
            onChange={setAutomaticCompactModeThreshold}
          />
          <div className="screen-size-hint">
            {t("settings.general.automaticCompactModeThresholdHint", { screenWidth: screenWidth })}
          </div>
        </div>
      )}
      <Checkbox checked={showLoadAnimation} onChange={setShowLoadAnimation}>
        {t("settings.general.showAnimationOnOpen")}
        <Hint content={t("settings.general.showAnimationOnOpenHint")} />
      </Checkbox>
    </m.div>
  );
};
