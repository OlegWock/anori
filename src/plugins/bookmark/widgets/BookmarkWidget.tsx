import { WidgetExpandArea } from "@anori/components/WidgetExpandArea/WidgetExpandArea";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Link } from "@anori/design-system/components/Link/Link";
import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { useAsyncEffect, useLinkNavigationState } from "@anori/utils/hooks";
import { normalizeUrl, parseHost } from "@anori/utils/misc";
import { usePermissionsQuery } from "@anori/utils/permissions";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { dnrPermissions, ensureDnrRules } from "@anori/utils/plugins/dnr";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import moment from "moment-timezone";
import { AnimatePresence } from "motion/react";
import { type MouseEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "styled-system/css";
import { token } from "styled-system/tokens";
import { updatePageStatusForWidget } from "../background";
import { useBookmarkStore } from "../storage";
import type { BookmarkWidgetConfig } from "../types";
import {
  bookmarkContent,
  bookmarkH2,
  bookmarkHost,
  bookmarkText,
  cornerControls,
  expandArea,
  expandButton,
  loadingIcon,
  statusDot,
  widget,
} from "./widget-styles";

export const BookmarkWidget = ({
  config,
  isMock,
  instanceId,
}: WidgetRenderProps<BookmarkWidgetConfig> & { isMock?: boolean }) => {
  const openIframe = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExpandArea(true);
    trackInteraction("Open iframe");
    if (hasDnrPermissions) {
      if (!showIframe) {
        ensureDnrRules(normalizedUrl).then(() => setShowIframe(true));
      }
    }
  };

  const closeExpand = () => {
    setShowExpandArea(false);
  };

  const createStatusMessage = () => {
    if (status === "loading") return t("bookmark-plugin.checkingStatus");
    console.log("Create status message", { lastStatusChange, lastCheck });
    return t("bookmark-plugin.status", {
      status: status === "up" ? t("bookmark-plugin.statusUp") : t("bookmark-plugin.statusDown"),
      lastChange: lastStatusChangeMoment.fromNow(),
      lastCheck: lastCheckMoment.fromNow(),
    });
  };

  const [showExpandArea, setShowExpandArea] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

  const { rem } = useSizeSettings();
  const store = useBookmarkStore();
  const { t, i18n } = useTranslation();
  const trackInteraction = useWidgetInteractionTracker();

  const [status] = store.useValue("status", "loading");
  const [lastCheck] = store.useValue("lastCheck", undefined);
  const [lastStatusChange] = store.useValue("lastStatusChange", undefined);
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const lastCheckMoment = useMemo(() => moment(lastCheck), [lastCheck, i18n.language]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: same as above
  const lastStatusChangeMoment = useMemo(() => moment(lastStatusChange), [lastStatusChange, i18n.language]);
  const statusColor = {
    loading: token("colors.text.disabled"),
    up: token("colors.status.up"),
    down: token("colors.status.down"),
  }[status];

  const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
  const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);

  const {
    size: { width },
  } = useWidgetMetadata();
  const size = width === 1 ? "s" : "m";

  const { onLinkClick, isNavigating } = useLinkNavigationState();

  useAsyncEffect(async () => {
    if (!config.checkStatus) return;
    await store.waitForLoad();
    const lastCheck = store.get("lastCheck");
    console.log("Last checked status for", config.url, "at", lastCheck);
    if (!lastCheck) {
      updatePageStatusForWidget(instanceId, config.url);
    }
  }, [config.url]);

  const hasDnrPermissions = usePermissionsQuery({
    hosts: [parseHost(config.url)],
    permissions: ["declarativeNetRequestWithHostAccess", "browsingData"],
  });

  const [prevUrl, setPrevUrl] = useState(config.url);
  if (prevUrl && prevUrl !== config.url) {
    setPrevUrl(config.url);
    setShowIframe(false);
  }

  return (
    <>
      <Link
        className={widget}
        href={isMock ? undefined : normalizedUrl}
        onClick={(e) => {
          trackInteraction("Open bookmark");
          return onLinkClick(e);
        }}
        target={config.openInNewTab ? "_blank" : undefined}
      >
        <div className={bookmarkContent({ size })}>
          <div className={bookmarkText}>
            <h2 className={bookmarkH2({ size })}>{config.title}</h2>
            <div className={bookmarkHost}>{host}</div>
          </div>
          {isNavigating && !config.openInNewTab ? (
            <Icon
              className={loadingIcon}
              icon={builtinIcons.spinner}
              width={size === "m" ? rem(5.75) : rem(2.25)}
              height={size === "m" ? rem(5.75) : rem(2.25)}
            />
          ) : (
            <Icon
              icon={config.icon}
              width={size === "m" ? rem(5.75) : rem(2.25)}
              height={size === "m" ? rem(5.75) : rem(2.25)}
            />
          )}
        </div>
        <div className={cornerControls}>
          {config.checkStatus && (
            <Tooltip label={createStatusMessage}>
              <div className={statusDot} style={{ backgroundColor: statusColor }} />
            </Tooltip>
          )}

          {["chrome", "firefox"].includes(X_BROWSER) && (
            <IconButton
              variant="secondary"
              icon={builtinIcons.expand}
              label={t("bookmark-plugin.openInIframe")}
              onClick={openIframe}
              className={cx(expandButton, "open-in-iframe")}
            />
          )}
        </div>
      </Link>
      <AnimatePresence>
        {showExpandArea && (
          <WidgetExpandArea title={config.title} onClose={closeExpand} size="max" withoutScroll className={expandArea}>
            <RequirePermissions
              hosts={[parseHost(config.url)]}
              permissions={dnrPermissions}
              onGrant={() => {
                ensureDnrRules(config.url).then(() => setShowIframe(true));
              }}
            >
              {showIframe && (
                <iframe
                  src={config.url}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; cross-origin-isolated"
                  title={t("iframe-plugin.name")}
                />
              )}
            </RequirePermissions>
          </WidgetExpandArea>
        )}
      </AnimatePresence>
    </>
  );
};
