import { Badge } from "@anori/design-system/components/Badge/Badge";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Link } from "@anori/design-system/components/Link/Link";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

const CHANGELOG_URL = "https://github.com/OlegWock/anori/blob/master/CHANGELOG.md";
const CURRENT_VERSION = "2.1.0";
const RELEASE = "releaseNotes.v2_1_0";

const MINOR_CHANGES = [
  { tag: "tagNew", key: "minorPopup" },
  { tag: "tagNew", key: "minorDevices" },
  { tag: "tagImproved", key: "minorTabsPlugin" },
  { tag: "tagImproved", key: "minorWidgetHeaders" },
  { tag: "tagImproved", key: "minorPlurals" },
  { tag: "tagImproved", key: "minorWhatsNew" },
  { tag: "tagImproved", key: "minorTranslatedNotes" },
  { tag: "tagFixed", key: "minorBackground" },
  { tag: "tagFixed", key: "minorFirefoxPermission" },
] as const;

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
  const { t } = useTranslation();
  return (
    <div className={whatsNew}>
      <ScrollArea className={scrollArea}>
        <div className={scrollBody}>
          <div className={hero}>
            <div className={heroVersion}>{CURRENT_VERSION}</div>
            <div className={heroHeadline}>{t(`${RELEASE}.headline`)}</div>
          </div>

          <div className={content}>
            <Feature icon={builtinIcons.archive} title={t(`${RELEASE}.stashTitle`)}>
              <p>{t(`${RELEASE}.stashBody`)}</p>
              <p>{t(`${RELEASE}.stashSync`)}</p>
            </Feature>

            <Feature icon={builtinIcons.tabsFill} title={t(`${RELEASE}.syncedTabsTitle`)}>
              <p>{t(`${RELEASE}.syncedTabsBody`)}</p>
            </Feature>

            <Feature icon={builtinIcons.checklist} title={t("releaseNotes.alsoInThisRelease")} muted>
              <ul className={minorList}>
                {MINOR_CHANGES.map(({ tag, key }) => (
                  <li className={minorItem} key={key}>
                    <Badge className={minorTag}>{t(`releaseNotes.${tag}`)}</Badge>
                    {t(`${RELEASE}.${key}`)}
                  </li>
                ))}
              </ul>
            </Feature>
          </div>

          <div className={footer}>
            <Trans
              i18nKey="releaseNotes.changelogNote"
              components={[<Link key="changelog" href={CHANGELOG_URL} target="_blank" rel="noreferrer" />]}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
