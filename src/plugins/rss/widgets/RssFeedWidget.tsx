import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import { sendMessage } from "../messaging";
import type { RssFeedConfig } from "../types";
import { type RssPost, useRssFeeds } from "../utils";
import { Post } from "./Post";

const feedWidget = css({ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" });
const titleWrapper = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1",
});
const posts = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
  variants: { compact: { true: { gap: "1" } } },
});
const separator = css({
  alignSelf: "stretch",
  borderBottomWidth: "1px",
  borderBottomStyle: "solid",
  borderBottomColor: "frosted.strong",
});
const feedPost = css({ padding: "1", borderRadius: "sm" });
const emptyFeed = css({ flexGrow: 1, justifyContent: "center" });

export const RssFeed = ({ config }: WidgetRenderProps<RssFeedConfig>) => {
  const { t } = useTranslation();
  const { feed, isRefreshing, refresh, lastUpdated } = useRssFeeds(config.feedUrls, (url) =>
    sendMessage("getFeedText", { url }),
  );

  const lastRefresh = useMemo(
    () => (lastUpdated ? t("lastUpdatedAt", { datetime: lastUpdated.format("HH:mm") }) : t("refreshing")),
    [lastUpdated, t],
  );
  const trimmedFeed = feed.slice(0, 100);

  return (
    <div className={feedWidget}>
      <div className={titleWrapper}>
        <h2>{config.title}</h2>
        <IconButton
          variant="frosted"
          size="compact"
          icon={builtinIcons.refresh}
          label={t("refresh")}
          tooltip={lastRefresh}
          loading={isRefreshing}
          onClick={() => refresh()}
        />
      </div>
      {trimmedFeed.length === 0 ? (
        <EmptyState muted className={emptyFeed} title={t("rss-plugin.noPosts")} />
      ) : (
        <ScrollArea type="hover">
          <div className={posts({ compact: config.compactView })}>
            {trimmedFeed.map((post, i) => {
              if (i === 0) return <Post className={feedPost} post={post} key={post.url} compact={config.compactView} />;

              return (
                <Fragment key={post.url}>
                  <div className={separator} />
                  <Post className={feedPost} post={post} compact={config.compactView} />
                </Fragment>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export const RssFeedMock = () => {
  const { t } = useTranslation();

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
    <div className={feedWidget}>
      <div className={titleWrapper}>
        <h2>{t("rss-plugin.name")}</h2>
        <IconButton variant="frosted" icon={builtinIcons.refresh} label={t("refresh")} />
      </div>
      <ScrollArea type="hover">
        <div className={posts({})}>
          {feed.map((post, i) => {
            if (i === 0) return <Post className={feedPost} post={post} key={i.toString()} />;

            return (
              <Fragment key={i.toString()}>
                <div className={separator} />
                <Post className={feedPost} post={post} />
              </Fragment>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
