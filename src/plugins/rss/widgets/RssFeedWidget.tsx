import { Button } from "@anori/components/Button";
import { ScrollArea } from "@anori/components/ScrollArea";
import { Tooltip } from "@anori/components/Tooltip";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import clsx from "clsx";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sendMessage } from "../messaging";
import type { RssFeedConfig } from "../types";
import { type RssPost, useRssFeeds } from "../utils";
import { Post } from "./Post";
import "./RssFeedWidget.scss";

export const RssFeed = ({ config }: WidgetRenderProps<RssFeedConfig>) => {
  const { t } = useTranslation();
  const { rem } = useSizeSettings();
  const { feed, isRefreshing, refresh, lastUpdated } = useRssFeeds(config.feedUrls, (url) =>
    sendMessage("getFeedText", { url }),
  );

  const lastRefresh = useMemo(
    () => (lastUpdated ? t("lastUpdatedAt", { datetime: lastUpdated.format("HH:mm") }) : t("refreshing")),
    [lastUpdated, t],
  );
  const trimmedFeed = feed.slice(0, 100);

  return (
    <div className="RssFeed">
      <div className="title-wrapper">
        <h2>{config.title}</h2>
        <Tooltip label={lastRefresh}>
          <Button className="refresh-button" visuallyDisabled={isRefreshing} onClick={() => refresh()}>
            <Icon
              icon={builtinIcons.refresh}
              height={rem(1.25)}
              variants={{
                loading: { rotate: [0, 360] },
              }}
              animate={isRefreshing ? "loading" : undefined}
              transition={{
                duration: 2,
                repeat: isRefreshing ? Number.POSITIVE_INFINITY : 0,
                repeatDelay: 0.2,
                ease: "easeInOut",
              }}
            />
          </Button>
        </Tooltip>
      </div>
      <ScrollArea type="hover" color="dark">
        <div className={clsx("posts", config.compactView && "compact")}>
          {trimmedFeed.map((post, i) => {
            if (i === 0) return <Post post={post} key={post.url} compact={config.compactView} />;

            return (
              <Fragment key={post.url}>
                <div className="separator" />
                <Post post={post} compact={config.compactView} />
              </Fragment>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export const RssFeedMock = () => {
  const { t } = useTranslation();
  const { rem } = useSizeSettings();

  const feed: RssPost[] = [
    {
      title: t("rss-plugin.examplePostTitle1"),
      description: t("rss-plugin.examplePostDescription1"),
      url: "",
      timestamp: Date.now() - 1000 * 60 * 60 * 1,
      feed: {
        title: t("rss-plugin.exampleFeedTitle1"),
        description: "",
        url: "#",
      },
    },
    {
      title: t("rss-plugin.examplePostTitle2"),
      description: t("rss-plugin.examplePostDescription2"),
      url: "",
      timestamp: Date.now() - 1000 * 60 * 60 * 3,
      feed: {
        title: t("rss-plugin.exampleFeedTitle2"),
        description: "",
        url: "#",
      },
    },
    {
      title: t("rss-plugin.examplePostTitle3"),
      description: t("rss-plugin.examplePostDescription3"),
      url: "",
      timestamp: Date.now() - 1000 * 60 * 60 * 5,
      feed: {
        title: t("rss-plugin.exampleFeedTitle3"),
        description: "",
        url: "#",
      },
    },
  ];

  return (
    <div className="RssFeed">
      <div className="title-wrapper">
        <h2>{t("rss-plugin.name")}</h2>
        <Button className="refresh-button">
          <Icon icon={builtinIcons.refresh} height={rem(1.25)} />
        </Button>
      </div>
      <ScrollArea type="hover" color="dark">
        <div className="posts">
          {feed.map((post, i) => {
            if (i === 0) return <Post post={post} key={i.toString()} />;

            return (
              <Fragment key={i.toString()}>
                <div className="separator" />
                <Post post={post} />
              </Fragment>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
