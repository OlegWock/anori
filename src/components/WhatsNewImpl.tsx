import { Badge } from "@anori/design-system/components/Badge/Badge";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Link } from "@anori/design-system/components/Link/Link";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

const CHANGELOG_URL = "https://github.com/OlegWock/anori/blob/master/CHANGELOG.md";
const CURRENT_VERSION = "2.1.0";

const whatsNew = css({ maxWidth: "600px", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 });

const hero = css({
  position: "relative",
  overflow: "hidden",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "2",
  paddingInline: "5",
  paddingBlock: "5",
  borderRadius: "lg",
  bg: "accent",
  color: "on-accent",
  boxShadow: "accent.edge",
  _before: {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.25,
    backgroundImage: "radial-gradient(currentcolor, currentcolor 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 100%)",
    backgroundSize: "22px 22px",
  },
});
const heroVersion = css({ position: "relative", fontSize: "3xl", fontWeight: "light", lineHeight: "none" });
const heroHeadline = css({ position: "relative", fontSize: "base", textWrap: "pretty" });

const scrollArea = css({ marginTop: 0, marginInline: "1-5", marginBottom: "3", minHeight: 0 });
const scrollBody = css({ display: "flex", flexDirection: "column", gap: "4", paddingInline: "4", paddingBottom: "1" });
const content = css({ display: "flex", flexDirection: "column", gap: "3" });

const featureCard = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  padding: "4",
  borderRadius: "lg",
  bg: "surface.elevated",
  boxShadow: "surface.elevated.edge",
});
const featureTitle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  margin: 0,
  fontSize: "lg",
  fontWeight: "regular",
  color: "text.primary",
});
const featureIcon = css({ flexShrink: 0, color: "accent" });
const featureIconMuted = css({ color: "icon.subtle" });
const featureBody = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  fontSize: "sm",
  color: "text.subtle",
  textWrap: "pretty",
});

const minorList = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  margin: 0,
  paddingLeft: "5",
  listStyleType: "disc",
  fontSize: "sm",
  color: "text.subtle",
});
const minorItem = css({ display: "list-item", textWrap: "pretty" });
const minorTag = css({ marginRight: "1-5", verticalAlign: "top" });

const footer = css({ fontSize: "sm", color: "text.placeholder", textWrap: "pretty" });

const MinorChange = ({ tag, children }: { tag: string; children: ReactNode }) => {
  return (
    <li className={minorItem}>
      <Badge className={minorTag}>{tag}</Badge>
      {children}
    </li>
  );
};

const Feature = ({
  icon,
  title,
  muted,
  children,
}: {
  icon: string;
  title: string;
  muted?: boolean;
  children: ReactNode;
}) => {
  return (
    <section className={featureCard}>
      <h3 className={featureTitle}>
        <Icon icon={icon} width={20} height={20} className={cx(featureIcon, muted && featureIconMuted)} aria-hidden />
        {title}
      </h3>
      <div className={featureBody}>{children}</div>
    </section>
  );
};

export const WhatsNewImpl = () => {
  const { t, i18n } = useTranslation();
  return (
    <div className={whatsNew}>
      <ScrollArea className={scrollArea}>
        <div className={scrollBody}>
          <div className={hero}>
            <div className={heroVersion}>{CURRENT_VERSION}</div>
            <div className={heroHeadline}>
              Now with extended Tabs plugin. Keep the links you mean to get back to, and pick up the tabs you left open
              on another device.
            </div>
          </div>

          <div className={content}>
            {i18n.language !== "en" && <section>{t("availableOnlyInEnglish")}</section>}

            <Feature icon={builtinIcons.archive} title="Tab stash">
              <p>
                Use this widget to store the links you mean to get back to later. Keep them on your new tab so you'll
                actually remember them. A tab can be stashed from the widget itself or from the new Anori popup window,
                just click on the Anori icon in the extension's toolbar.
              </p>
              <p>
                With Anori Plus your stash is shared across every browser you're signed into, and across all profiles.
              </p>
            </Feature>

            <Feature icon={builtinIcons.tabsFill} title="Synced tabs">
              <p>
                See what's open on your other devices, and effortlessly pick up where you left off on a previous device.
                Please note that this feature requires Anori Plus and an explicit opt-in in settings.
              </p>
            </Feature>

            <Feature icon={builtinIcons.checklist} title="Also in this release" muted>
              <ul className={minorList}>
                <MinorChange tag="New">
                  Clicking the Anori icon in the toolbar now opens a popup instead of just opening a new tab.
                </MinorChange>
                <MinorChange tag="New">
                  Settings gained a Devices section, where you can see everything signed into your Anori Plus account,
                  and rename or remove it.
                </MinorChange>
                <MinorChange tag="Improved">
                  The Recently closed tabs widget was folded into a new Tabs plugin alongside the two widgets above, and
                  it can now be resized taller than before.
                </MinorChange>
                <MinorChange tag="Improved">
                  Tasks, Notes, RSS feed, Weather forecast and Recently closed tabs now share one header layout, so
                  their titles and buttons line up side by side.
                </MinorChange>
                <MinorChange tag="Improved">
                  Translated languages now use correct plural forms, instead of borrowing English's one-or-many rule.
                </MinorChange>
                <MinorChange tag="Improved">
                  The screen you're reading was redesigned, and notes for older versions moved out of the extension into
                  a changelog on GitHub.
                </MinorChange>
                <MinorChange tag="Fixed">
                  Background images stay centered when you resize the browser window, instead of being cropped from the
                  right and bottom.
                </MinorChange>
                <MinorChange tag="Fixed">
                  On Firefox, the permission prompt is no longer left hidden behind the toolbar popup.
                </MinorChange>
              </ul>
            </Feature>
          </div>

          <div className={footer}>
            Looking for the changelog for older versions? You can find it{" "}
            <Link href={CHANGELOG_URL} target="_blank" rel="noreferrer">
              on GitHub
            </Link>
            .
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
