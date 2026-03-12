import { Trans, useTranslation } from "react-i18next";
import "./Onboarding.scss";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { Select } from "@anori/components/lazy-components";
import { type Language, availableTranslations, availableTranslationsPrettyNames } from "@anori/translations/metadata";
import { switchTranslationLanguage } from "@anori/translations/utils";
import type { GridDimensions } from "@anori/utils/grid/types";
import { useHotkeys, usePrevious } from "@anori/utils/hooks";
import { useMotionTransition } from "@anori/utils/motion/hooks";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import { useAnoriStorage } from "@anori/utils/storage/hooks";
import { useFolderWidgets, useFolders } from "@anori/utils/user-data/hooks";
import { useDirection } from "@radix-ui/react-direction";
import { AnimatePresence, LayoutGroup, m, useTransform } from "framer-motion";
import { type ComponentProps, forwardRef, useEffect, useState } from "react";
import useMeasure from "react-use-motion-measure";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { slidingScreensAnimation } from "./animations";
import { applyOnboardingPreset } from "./apply-onboarding-preset";
import { Icon } from "./icon/Icon";

const screens = ["start", "folders", "customization", "analytics", "presets"] as const;

const Section = forwardRef<HTMLDivElement, ComponentProps<typeof m.section>>(({ ...props }, ref) => {
  return (
    <m.section variants={slidingScreensAnimation} ref={ref} initial="initial" animate="show" exit="hide" {...props} />
  );
});

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
    <div className="Onboarding">
      <LayoutGroup>
        <m.div
          className="content-wrapper"
          style={{
            height: animatedHeightCorrected,
          }}
        >
          <m.div className="content" ref={ref}>
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

                  <Checkbox className="analytics-checkbox" checked={analyticsEnabled} onChange={setAnalyticsEnabled}>
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

                  <Button className="preset" onClick={() => applyOnboardingPreset({ t, gridDimensions, addWidget })}>
                    {t("onboarding.presets.cta")}
                  </Button>
                </Section>
              )}
            </AnimatePresence>
          </m.div>
        </m.div>
        <m.div className="navigation-buttons" layout>
          <AnimatePresence initial={false}>
            {screenIndex !== 0 && (
              <Button
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
              </Button>
            )}
            <div className="spacer" />
            {screenIndex !== screens.length - 1 && (
              <Button
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
              </Button>
            )}
          </AnimatePresence>
        </m.div>
      </LayoutGroup>
    </div>
  );
};
