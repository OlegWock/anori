import { RequirePermissions } from "@anori/components/RequirePermissions";
import { translate } from "@anori/translations/utils";
import { parseHost } from "@anori/utils/misc";
import { defineWidget } from "@anori/utils/plugins/define";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { RssFeedConfig, RssLatestPostConfig } from "../types";
import { RssFeed, RssFeedMock } from "./RssFeedWidget";
import { RssFeedConfigScreen } from "./RssFeedWidgetConfig";
import { RssLatestPost, RssLatestPostMock } from "./RssLatestPostWidget";
import { RssLatestPostConfigScreen } from "./RssLatestPostWidgetConfig";

export const rssFeedDescriptor = defineWidget({
  id: "rss-feed",
  get name() {
    return translate("rss-plugin.widgetFeedName");
  },
  configurationScreen: RssFeedConfigScreen,
  mainScreen: (props: WidgetRenderProps<RssFeedConfig>) => (
    <RequirePermissions hosts={props.config.feedUrls.map((u) => parseHost(u))}>
      <RssFeed {...props} />
    </RequirePermissions>
  ),
  mock: RssFeedMock,
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
    },
    size: {
      width: 3,
      height: 3,
    },
  },
});

export const rssLastestPostDescriptor = defineWidget({
  id: "rss-latest-post",
  get name() {
    return translate("rss-plugin.widgetLatestPostName");
  },
  configurationScreen: RssLatestPostConfigScreen,
  mainScreen: (props: WidgetRenderProps<RssLatestPostConfig>) => (
    <RequirePermissions compact hosts={[parseHost(props.config.feedUrl)]} permissions={["tabs"]}>
      <RssLatestPost {...props} />
    </RequirePermissions>
  ),
  mock: RssLatestPostMock,
  appearance: {
    withHoverAnimation: true,
    resizable: false,
    size: {
      width: 2,
      height: 1,
    },
  },
});
