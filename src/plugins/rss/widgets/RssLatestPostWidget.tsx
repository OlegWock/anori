import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sendMessage } from "../messaging";
import type { RssLatestPostConfig } from "../types";
import { useRssFeeds } from "../utils";
import { Post } from "./Post";
import "./RssLatestPostWidget.scss";

export const RssLatestPost = ({ config }: WidgetRenderProps<RssLatestPostConfig>) => {
  const { t } = useTranslation();
  const feeds = useMemo(() => [config.feedUrl], [config.feedUrl]);
  const { feed, isRefreshing } = useRssFeeds(feeds, (url) => sendMessage("getFeedText", { url }));

  const lastPost = feed[0];

  return (
    <div className="RssLatestPost">
      {!!lastPost && <Post clampTitle post={lastPost} key={lastPost.url} />}
      {!lastPost && (
        <>
          {isRefreshing && <>{t("refreshing")}</>}
          {!isRefreshing && <>{t("rss-plugin.noPosts")}</>}
        </>
      )}
    </div>
  );
};

export const RssLatestPostMock = () => {
  const { t } = useTranslation();
  return (
    <div className="RssLatestPost">
      <Post
        post={{
          title: t("rss-plugin.examplePostTitle1"),
          description: "",
          url: "#",
          timestamp: Date.now() - 1000 * 60 * 60 * 18,
          feed: {
            title: t("rss-plugin.exampleFeedTitle1"),
            url: "#",
            description: "",
          },
        }}
      />
    </div>
  );
};
