import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { useLinkNavigationState } from "@anori/utils/hooks";
import { normalizeUrl } from "@anori/utils/misc";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { isMacLike } from "@anori/utils/shortcuts";
import clsx from "clsx";
import type { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";
import { sendMessage } from "../messaging";
import type { BookmarkGroupWidgetConfig } from "../types";
import "./BookmarkWidget.scss";

export const BookmarkGroupWidget = ({
  config,
}: WidgetRenderProps<BookmarkGroupWidgetConfig> & { isMock?: boolean }) => {
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
    <button
      type="button"
      className={clsx(["BookmarkWidget", `size-${size}`])}
      onClick={openGroup}
      onAuxClick={openGroup}
    >
      <div className="bookmark-content">
        <div className="text">
          <h2>{config.title}</h2>
          <div className="host">{t("bookmark-plugin.group")}</div>
        </div>
        {isNavigating ? (
          <Icon
            className="loading"
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
};
