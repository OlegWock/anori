import vtuberLogo from "@anori/assets/images/vtuber-logo-dark.svg";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { m } from "framer-motion";
import type { ComponentProps } from "react";
import { Trans, useTranslation } from "react-i18next";
import { License } from "../components/License";
import "./HelpAboutScreen.scss";

export const HelpAboutScreen = (props: ComponentProps<typeof m.div>) => {
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
