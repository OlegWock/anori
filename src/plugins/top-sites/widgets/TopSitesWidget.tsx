import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Link } from "@anori/design-system/components/Link/Link";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import { useLinkNavigationState } from "@anori/utils/hooks";
import { parseHost } from "@anori/utils/misc";
import type { CorrectPermission } from "@anori/utils/permissions";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import type { EmptyObject } from "@anori/utils/types";
import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";
import browser from "webextension-polyfill";
import { useTopSitesStore } from "../storage";

const widget = cva({
  base: { display: "grid", gap: "2", flexGrow: 1, alignSelf: "stretch" },
  variants: {
    type: {
      horizontal: { gridTemplateColumns: "repeat(6, 1fr)" },
      vertical: { gridTemplateRows: "repeat(6, 1fr)", gridAutoFlow: "column" },
    },
  },
});
const linkPlate = css({
  textDecoration: "none",
  display: "flex",
  flexDirection: "column",
  gap: "2",
  alignItems: "center",
  justifyContent: "center",
  padding: "2",
  borderRadius: "md",
  transition: "0.1s ease-in-out",
  width: 0,
  minWidth: "100%",
  position: "relative",
  "@media (any-hover: hover)": { "&:hover": { background: "ghost.hover", "& .remove-link": { display: "flex" } } },
});
const plateIcon = css({ margin: "2", width: "1.75rem" });
const loadingIcon = css({ margin: "2", width: "1.75rem", animation: "spin 1.5s ease-in-out infinite" });
// Hidden until the plate is hovered;
const removeLink = css({ display: "none", position: "absolute", top: 0, right: 0, zIndex: 1 });
const siteTitle = cva({
  base: {
    lineHeight: "1.25rem",
    textOverflow: "ellipsis",
    overflow: "hidden",
    alignSelf: "stretch",
    fontSize: "sm",
    textAlign: "center",
  },
  variants: { vertical: { true: { height: "1.25rem", whiteSpace: "nowrap" }, false: { height: "2.5rem" } } },
});

const REQUIRED_PERMISSIONS: CorrectPermission[] = X_BROWSER === "firefox" ? ["topSites"] : ["topSites", "favicon"];

const LinkPlate = ({
  href,
  favicon,
  title,
  onRemove,
  vertical,
}: {
  href: string;
  favicon: string;
  title: string;
  onRemove: () => void;
  vertical: boolean;
}) => {
  const { onLinkClick, isNavigating } = useLinkNavigationState();
  const { isEditing } = useParentFolder();
  const trackInteraction = useWidgetInteractionTracker();
  const { t } = useTranslation();

  return (
    <Link
      className={linkPlate}
      href={href}
      onClick={(e) => {
        trackInteraction("Open website");
        onLinkClick(e);
      }}
    >
      {isNavigating && <Icon className={loadingIcon} icon={builtinIcons.spinner} width={32} height={32} />}
      {!isNavigating && <img className={plateIcon} src={favicon} aria-hidden />}
      <div className={siteTitle({ vertical })}>{title}</div>
      {isEditing && (
        <IconButton
          variant="frosted"
          size="compact"
          className={cx(removeLink, "remove-link")}
          icon={builtinIcons.close}
          label={t("top-sites-plugin.removeSite")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </Link>
  );
};

export const TopSitesWidget = memo(function TopSitesWidget({
  type,
}: WidgetRenderProps<EmptyObject> & { type: "horizontal" | "vertical" }) {
  const addToBlacklist = (url: string) => {
    setBlacklist((b) => [...b, url]);
  };

  const store = useTopSitesStore();
  const [blacklist, setBlacklist] = store.useValue("blacklist", []);

  const [sites, setSites] = useState<browser.TopSites.MostVisitedURL[]>([]);
  const {
    size: { height, width },
  } = useWidgetMetadata();
  const resizableDimension = type === "horizontal" ? height : width;
  const sitesToDisplay = useMemo(() => sites.slice(0, resizableDimension === 1 ? 6 : 12), [sites, resizableDimension]);

  useEffect(() => {
    const load = async () => {
      let data: browser.TopSites.MostVisitedURL[] = [];
      if (X_BROWSER === "firefox") {
        data = await browser.topSites.get({ includeFavicon: true, limit: 100 });
      } else {
        data = await browser.topSites.get();
      }

      setSites(data.filter((s) => !blacklist.includes(s.url)));
    };

    load();
    const tid = setInterval(() => load(), 1000 * 60 * 5);
    return () => clearInterval(tid);
  }, [blacklist]);

  return (
    <div className={widget({ type })}>
      {sitesToDisplay.map((s) => {
        const resUrl = new URL(browser.runtime.getURL("/_favicon/"));
        resUrl.searchParams.set("pageUrl", s.url);
        resUrl.searchParams.set("size", "32");
        const faviconUrl =
          X_BROWSER === "firefox"
            ? s.favicon || browser.runtime.getURL("/assets/images/icon48.png")
            : resUrl.toString();

        const title = !s.title || s.title.includes("://") ? parseHost(s.url) : s.title;
        return (
          <LinkPlate
            onRemove={() => addToBlacklist(s.url)}
            key={s.url}
            href={s.url}
            favicon={faviconUrl}
            title={title}
            vertical={type === "vertical"}
          />
        );
      })}
    </div>
  );
});

export const TopSitesWidgetMock = ({ type }: { type: "horizontal" | "vertical" }) => {
  const { rem } = useSizeSettings();
  return (
    <div className={widget({ type })}>
      <a className={linkPlate} href="http://example.com">
        <Icon icon={builtinIcons.logos.facebook} height={rem(2)} width={rem(2)} />
        <div className={siteTitle({ vertical: type === "vertical" })}>Facebook</div>
      </a>
      <a className={linkPlate} href="http://example.com">
        <Icon icon={builtinIcons.logos.twitter} height={rem(2)} width={rem(2)} />
        <div className={siteTitle({ vertical: type === "vertical" })}>Twitter</div>
      </a>
      <a className={linkPlate} href="http://example.com">
        <Icon icon={builtinIcons.logos.jira} height={rem(2)} width={rem(2)} />
        <div className={siteTitle({ vertical: type === "vertical" })}>Jira</div>
      </a>
      <a className={linkPlate} href="http://example.com">
        <Icon icon={builtinIcons.logos.github} height={rem(2)} width={rem(2)} />
        <div className={siteTitle({ vertical: type === "vertical" })}>GitHub</div>
      </a>
      <a className={linkPlate} href="http://example.com">
        <Icon icon={builtinIcons.logos.whatsapp} height={rem(2)} width={rem(2)} />
        <div className={siteTitle({ vertical: type === "vertical" })}>Whatsapp</div>
      </a>
      <a className={linkPlate} href="http://example.com">
        <Icon icon={builtinIcons.logos.notion} height={rem(2)} width={rem(2)} />
        <div className={siteTitle({ vertical: type === "vertical" })}>Notion</div>
      </a>
    </div>
  );
};

export { REQUIRED_PERMISSIONS };
