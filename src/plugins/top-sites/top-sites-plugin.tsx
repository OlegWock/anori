import { Button } from "@anori/components/Button";
import type { AnoriPlugin, WidgetDescriptor, WidgetRenderProps } from "@anori/utils/user-data/types";
import "./styles.scss";
import { Icon } from "@anori/components/Icon";
import { Link } from "@anori/components/Link";
import { RequirePermissions } from "@anori/components/RequirePermissions";
import { translate } from "@anori/translations/index";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { builtinIcons } from "@anori/utils/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import { useLinkNavigationState } from "@anori/utils/hooks";
import { parseHost } from "@anori/utils/misc";
import type { CorrectPermission } from "@anori/utils/permissions";
import { useWidgetMetadata, useWidgetStorage } from "@anori/utils/plugin";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import browser from "webextension-polyfill";

type WidgetStorageType = {
  blacklist: string[];
};

const REQUIRED_PERMISSIONS: CorrectPermission[] = X_BROWSER === "firefox" ? ["topSites"] : ["topSites", "favicon"];

const LinkPlate = ({
  href,
  favicon,
  title,
  onRemove,
}: { href: string; favicon: string; title: string; onRemove: () => void }) => {
  const { onLinkClick, isNavigating } = useLinkNavigationState();
  const { isEditing } = useParentFolder();
  const trackInteraction = useWidgetInteractionTracker();

  return (
    <Link
      href={href}
      onClick={(e) => {
        trackInteraction("Open website");
        onLinkClick(e);
      }}
    >
      {isNavigating && <Icon className="loading" icon={builtinIcons.spinner} width={32} height={32} />}
      {!isNavigating && <img src={favicon} aria-hidden />}
      <div className="site-title">{title}</div>
      {isEditing && (
        <Button
          className="remove-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        >
          <Icon icon={builtinIcons.close} width={16} height={16} />
        </Button>
      )}
    </Link>
  );
};

const MainScreen = ({ type }: WidgetRenderProps & { type: "horizontal" | "vertical" }) => {
  const addToBlacklist = (url: string) => {
    setBlacklist((b) => [...b, url]);
  };

  const store = useWidgetStorage<WidgetStorageType>();
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
    <div className={clsx("TopSitesWidget", type)}>
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
          />
        );
      })}
    </div>
  );
};

const Mock = ({ type }: { type: "horizontal" | "vertical" }) => {
  const { rem } = useSizeSettings();
  return (
    <div className={clsx("TopSitesWidget", type)}>
      <a href="http://example.com">
        <Icon icon={builtinIcons.logos.facebook} height={rem(2)} width={rem(2)} />
        <div className="site-title">Facebook</div>
      </a>
      <a href="http://example.com">
        <Icon icon={builtinIcons.logos.twitter} height={rem(2)} width={rem(2)} />
        <div className="site-title">Twitter</div>
      </a>
      <a href="http://example.com">
        <Icon icon={builtinIcons.logos.jira} height={rem(2)} width={rem(2)} />
        <div className="site-title">Jira</div>
      </a>
      <a href="http://example.com">
        <Icon icon={builtinIcons.logos.github} height={rem(2)} width={rem(2)} />
        <div className="site-title">GitHub</div>
      </a>
      <a href="http://example.com">
        <Icon icon={builtinIcons.logos.whatsapp} height={rem(2)} width={rem(2)} />
        <div className="site-title">Whatsapp</div>
      </a>
      <a href="http://example.com">
        <Icon icon={builtinIcons.logos.notion} height={rem(2)} width={rem(2)} />
        <div className="site-title">Notion</div>
      </a>
    </div>
  );
};

export const topSitesWidgetDescriptorHorizontal = {
  id: "top-sites-horizontal",
  get name() {
    return translate("top-sites-plugin.widgetHorizontal");
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions compact permissions={REQUIRED_PERMISSIONS}>
      <MainScreen type="horizontal" {...props} />
    </RequirePermissions>
  ),
  mock: () => <Mock type="horizontal" />,
  appearance: {
    size: {
      width: 4,
      height: 1,
    },
    resizable: {
      min: {
        width: 4,
        height: 1,
      },
      max: {
        width: 4,
        height: 2,
      },
    },
  },
} as const satisfies WidgetDescriptor;

export const topSitesWidgetDescriptorVertical = {
  id: "top-sites-vertical",
  get name() {
    return translate("top-sites-plugin.widgetVertical");
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions compact permissions={REQUIRED_PERMISSIONS}>
      <MainScreen type="vertical" {...props} />
    </RequirePermissions>
  ),
  mock: () => <Mock type="vertical" />,
  appearance: {
    size: {
      width: 1,
      height: 4,
    },
    resizable: {
      min: {
        width: 1,
        height: 4,
      },
      max: {
        width: 2,
        height: 4,
      },
    },
  },
} as const satisfies WidgetDescriptor;

export const topSitesPlugin = {
  id: "top-sites-plugin",
  get name() {
    return translate("top-sites-plugin.name");
  },
  widgets: [topSitesWidgetDescriptorHorizontal, topSitesWidgetDescriptorVertical],
  configurationScreen: null,
} satisfies AnoriPlugin;
