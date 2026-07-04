import vtuberLogo from "@anori/assets/images/vtuber-logo-dark.svg";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { m } from "motion/react";
import type { ComponentProps } from "react";
import { Trans, useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { License } from "../components/License";

const screen = css({ display: "flex", flexDirection: "column", gap: "5" });
const logo = css({ alignSelf: "center", width: "300px", height: "auto" });
const shortcutsSection = css({ display: "flex", flexDirection: "column", gap: "2" });

export const HelpAboutScreen = (props: ComponentProps<typeof m.div>) => {
  const { t, i18n } = useTranslation();
  return (
    <m.div {...props} className={screen}>
      <Heading level={2} size={1}>
        {t("settings.aboutHelp.title")}
      </Heading>
      <img src={vtuberLogo} alt="Anori logo" className={logo} />
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

      <section className={shortcutsSection}>
        <Heading marginBottom="2">{t("shortcuts.title")}</Heading>
        <ShortcutsHelp />
      </section>

      <section>
        <Heading marginBottom="2">{t("settings.aboutHelp.license")}</Heading>
        <License />
      </section>
    </m.div>
  );
};
