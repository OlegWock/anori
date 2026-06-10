import { Select } from "@anori/components/lazy-components";
import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { availableTranslations, availableTranslationsPrettyNames, type Language } from "@anori/translations/metadata";
import { switchTranslationLanguage } from "@anori/translations/utils";
import type { GridDimensions } from "@anori/utils/grid/types";
import { useHotkeys, usePrevious } from "@anori/utils/hooks";
import { useMotionTransition } from "@anori/utils/motion/hooks";
import { anoriSchema } from "@anori/utils/storage";
import { useAnoriStorage } from "@anori/utils/storage/hooks";
import { useStorageValue } from "@anori/utils/storage-lib";
import { useFolders, useFolderWidgets } from "@anori/utils/user-data/hooks";
import { useDirection } from "@radix-ui/react-direction";
import { AnimatePresence, LayoutGroup, m, useTransform } from "framer-motion";
import { type ComponentProps, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import useMeasure from "react-use-motion-measure";
import { css, cx } from "styled-system/css";
import { slidingScreensAnimation } from "./animations";
import { applyOnboardingPreset } from "./apply-onboarding-preset";

const screens = ["start", "folders", "customization", "analytics", "presets"] as const;

const onboarding = css({
  padding: "6",
  background: "card",
  borderRadius: "lg",
  display: "flex",
  flexDirection: "column",
  color: "text.primary",
  maxWidth: "800px",
  zIndex: 5,
  boxShadow: "rgba(0, 0, 0, 0.25) 0px 0px 6px 4px",
});
const contentWrapper = css({ padding: "2", overflow: "hidden", boxSizing: "content-box" });
const section = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "flex-start" });
const preset = css({ alignSelf: "center", marginTop: "2" });
const navigationButtons = css({
  padding: "2",
  display: "flex",
  alignItems: "center",
  marginTop: "4",
  "& svg": { color: "icon" },
});
const spacer = css({ flexGrow: 1 });

// The DS Button isn't a motion element; wrap it so the nav buttons can still fade in/out.
const MotionButton = m.create(Button);

const Section = ({ className, ref, ...props }: ComponentProps<typeof m.section>) => {
  return (
    <m.section
      variants={slidingScreensAnimation}
      ref={ref}
      initial="initial"
      animate="show"
      exit="hide"
      className={cx(section, className)}
      {...props}
    />
  );
};

const navigationButtonVariants = {
  initial: {
    opacity: 0,
  },
  show: {
    opacity: 1,
  },
  hide: {
    opacity: 0,
  },
};

export const Onboarding = ({ gridDimensions }: { gridDimensions: GridDimensions }) => {
  const { t } = useTranslation();
  const storage = useAnoriStorage();
  const [language, setLanguage] = useStorageValue(anoriSchema.language);
  const [analyticsEnabled, setAnalyticsEnabled] = useStorageValue(anoriSchema.analyticsEnabled);
  const [, setFinishedOnboarding] = useStorageValue(anoriSchema.finishedOnboarding);

  const [screenIndex, setScreenIndex] = useState<number>(0);
  const prevScreen = usePrevious(screenIndex) || 0;
  const shouldAnimateScreenChange = Math.abs(prevScreen - screenIndex) <= 1;
  const direction = !shouldAnimateScreenChange ? "none" : prevScreen <= screenIndex ? "right" : "left";

  const screenName = screens[screenIndex];

  const { activeFolder } = useFolders({ includeHome: true });
  const { addWidget } = useFolderWidgets(activeFolder);

  const [ref, bounds] = useMeasure();
  const animatedHeight = useMotionTransition(bounds.height, { type: "tween", duration: 0.15, ignoreInitial: true });

  useHotkeys(
    "right",
    () => {
      if (screenIndex < screens.length - 1) {
        setScreenIndex(screenIndex + 1);
      }
    },
    undefined,
    [screenIndex],
  );
  useHotkeys(
    "left",
    () => {
      if (screenIndex > 0) {
        setScreenIndex(screenIndex - 1);
      }
    },
    undefined,
    [screenIndex],
  );

  useEffect(() => {
    const finishedOnboarding = storage.get(anoriSchema.finishedOnboarding);
    if (finishedOnboarding) {
      setScreenIndex(screens.length - 1);
    }
  }, [storage]);

  useEffect(() => {
    if (screenIndex === screens.length - 1) {
      setFinishedOnboarding(true);
    }
  }, [screenIndex, setFinishedOnboarding]);

  // Need this to avoid initial flash when animatedHeight is 0
  const animatedHeightCorrected = useTransform(animatedHeight, (val) => (val === 0 ? undefined : val));
  const dir = useDirection();

  return (
    <div className={onboarding}>
      <LayoutGroup>
        <m.div
          className={contentWrapper}
          style={{
            height: animatedHeightCorrected,
          }}
        >
          <m.div ref={ref}>
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              {screenName === "start" && (
                <Section custom={direction} key="start">
                  <h1>{t("onboarding.start.title")}</h1>
                  <p>
                    {t("onboarding.start.p1", {
                      languages: availableTranslations.map((code) => availableTranslationsPrettyNames[code]).join(", "),
                    })}
                  </p>

                  <Select<Language>
                    value={language}
                    onChange={(newLang) => {
                      console.log("Saving new language", newLang);
                      setLanguage(newLang);
                      switchTranslationLanguage(newLang);
                    }}
                    options={availableTranslations}
                    getOptionKey={(o) => o}
                    getOptionLabel={(o) => availableTranslationsPrettyNames[o]}
                  />

                  <p>{t("onboarding.start.p2")}</p>

                  <p>{t("onboarding.start.p3")}</p>

                  <p>{t("onboarding.start.p4")}</p>
                </Section>
              )}
              {screenName === "folders" && (
                <Section custom={direction} key="folders">
                  <h1>{t("onboarding.folders.title")}</h1>
                  <p>{t("onboarding.folders.p1")}</p>
                  <p>{t("onboarding.folders.p2")}</p>
                </Section>
              )}
              {screenName === "customization" && (
                <Section custom={direction} key="customization">
                  <h1>{t("onboarding.customization.title")}</h1>
                  <p>{t("onboarding.customization.p1")}</p>
                  <p>{t("onboarding.customization.p2")}</p>
                  <p>{t("onboarding.customization.p3")}</p>
                </Section>
              )}
              {screenName === "analytics" && (
                <Section custom={direction} key="analytics">
                  <h1>{t("onboarding.analytics.title")}</h1>
                  <p>{t("onboarding.analytics.p1")}</p>
                  <p>{t("onboarding.analytics.p2")}</p>
                  <p>
                    <Trans t={t} i18nKey="onboarding.analytics.p3">
                      {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
                      <a href="https://anori.app/privacy#analytics" target="_blank" rel="noreferrer" />
                    </Trans>
                  </p>

                  <Checkbox checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
                    {t("settings.general.enableAnalytics")}
                  </Checkbox>
                </Section>
              )}
              {screenName === "presets" && (
                <Section custom={direction} key="presets">
                  <h1>{t("onboarding.presets.title")}</h1>
                  <p>{t("onboarding.presets.p1")}</p>
                  <p>{t("onboarding.presets.p2")}</p>
                  <p>{t("onboarding.presets.p3")}</p>

                  <Button
                    variant="frosted"
                    className={preset}
                    onClick={() => applyOnboardingPreset({ t, gridDimensions, addWidget })}
                  >
                    {t("onboarding.presets.cta")}
                  </Button>
                </Section>
              )}
            </AnimatePresence>
          </m.div>
        </m.div>
        <m.div className={navigationButtons} layout>
          <AnimatePresence initial={false}>
            {screenIndex !== 0 && (
              <MotionButton
                variant="frosted"
                variants={navigationButtonVariants}
                initial="initial"
                animate="show"
                exit="hide"
                key="back-btn"
                onClick={() => setScreenIndex((p) => p - 1)}
              >
                <Icon
                  icon={dir === "ltr" ? builtinIcons.chevronBack : builtinIcons.chevronForward}
                  width={24}
                  height={24}
                />{" "}
                {t("back")}
              </MotionButton>
            )}
            <div className={spacer} />
            {screenIndex !== screens.length - 1 && (
              <MotionButton
                variant="frosted"
                variants={navigationButtonVariants}
                initial="initial"
                animate="show"
                exit="hide"
                key="next-btn"
                onClick={() => {
                  setScreenIndex((p) => p + 1);
                }}
              >
                {t("next")}{" "}
                <Icon
                  icon={dir === "ltr" ? builtinIcons.chevronForward : builtinIcons.chevronBack}
                  width={24}
                  height={24}
                />
              </MotionButton>
            )}
          </AnimatePresence>
        </m.div>
      </LayoutGroup>
    </div>
  );
};
