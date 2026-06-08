import { CheckboxWithPermission } from "@anori/components/CheckboxWithPermission";
import { Select } from "@anori/components/lazy-components";
import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { Hint } from "@anori/design-system/components/Hint/Hint";
import { Input } from "@anori/design-system/components/Input/Input";
import { availableTranslations, availableTranslationsPrettyNames, type Language } from "@anori/translations/metadata";
import { switchTranslationLanguage } from "@anori/translations/utils";
import { useScreenWidth } from "@anori/utils/compact";
import { setPageTitle } from "@anori/utils/page";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import { m } from "framer-motion";
import { type ComponentProps, useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const screen = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  // Stretch controls inside Field wrappers to the column width.
  "& .Input, & .SelectTrigger": { width: "100%" },
});
const screenSizeHint = css({ marginLeft: "1" });

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
    <m.div {...props} className={screen}>
      <Heading level={2} size={1}>
        {t("settings.general.title")}
      </Heading>
      <Field label={`${t("settings.general.language")}:`}>
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
      </Field>
      <Alert variant="info">
        <Trans t={t} i18nKey="settings.general.translationInfo">
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://github.com/OlegWock/anori/issues/104" />
        </Trans>
      </Alert>

      <Field label={`${t("settings.general.sidebarOrientation")}:`}>
        <Select<"auto" | "vertical" | "horizontal">
          value={sidebarOrientation}
          onChange={setSidebarOrientation}
          options={["auto", "vertical", "horizontal"]}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => t(`settings.general.sidebarOrientationOption-${o}`)}
        />
      </Field>
      <Field label={`${t("settings.general.newTabTitle")}:`}>
        <Input value={newTabTitle} onValueChange={setNewTabTitle} />
      </Field>

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
          <Field label={t("settings.general.automaticCompactModeThreshold")}>
            <Select<number>
              options={screenSizeBreakpoints}
              getOptionKey={(o) => o.toString()}
              getOptionLabel={(o) => `< ${o}${t("px")}`}
              value={automaticCompactModeThreshold}
              onChange={setAutomaticCompactModeThreshold}
            />
          </Field>
          <div className={screenSizeHint}>
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
