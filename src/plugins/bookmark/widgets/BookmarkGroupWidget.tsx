import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { useLinkNavigationState } from "@anori/utils/hooks";
import { normalizeUrl } from "@anori/utils/misc";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { isMacLike } from "@anori/utils/shortcuts";
import type { MouseEventHandler } from "react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { sendMessage } from "../messaging";
import type { BookmarkGroupWidgetConfig } from "../types";
import { bookmarkContent, bookmarkH2, bookmarkHost, bookmarkText, loadingIcon, widget } from "./widget-styles";

export const BookmarkGroupWidget = memo(function BookmarkGroupWidget({
  config,
}: WidgetRenderProps<BookmarkGroupWidgetConfig> & { isMock?: boolean }) {
  const openGroup: MouseEventHandler<HTMLElement> = (e) => {
    trackInteraction("Open group");
    e.preventDefault();
    // aux click but with another button, like rmb
    if (e.type === "auxclick" && e.button !== 1) {
      return;
    }
    onLinkClick(e);
    const shouldKeepCurrentTab = e.ctrlKey || (isMacLike && e.metaKey) || e.type === "auxclick";
    sendMessage("openGroup", {
      urls: config.urls.map((u) => normalizeUrl(u)),
      openInTabGroup: config.openInTabGroup,
      closeCurrentTab: !shouldKeepCurrentTab,
      title: config.title,
    });
  };
  const { rem } = useSizeSettings();
  const { onLinkClick, isNavigating } = useLinkNavigationState();
  const { t } = useTranslation();
  const {
    size: { width },
  } = useWidgetMetadata();
  const trackInteraction = useWidgetInteractionTracker();
  const size = width === 1 ? "s" : "m";

  return (
    <button type="button" className={widget} onClick={openGroup} onAuxClick={openGroup}>
      <div className={bookmarkContent({ size })}>
        <div className={bookmarkText}>
          <Heading singleLine={false} className={bookmarkH2({ size })}>
            {config.title}
          </Heading>
          <div className={bookmarkHost}>{t("bookmark-plugin.group")}</div>
        </div>
        {isNavigating ? (
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
    </button>
  );
});
