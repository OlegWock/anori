import { lazyAsyncVariable } from "@utils/misc";
import { NamespacedStorage } from "@utils/namespaced-storage";
import { useWidgetStorage } from "@utils/plugin";
import moment from "moment-timezone";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type Parser from "rss-parser";

const globalParser = lazyAsyncVariable<Parser>(() => import("rss-parser").then((m) => new m.default()));

export type RssFeed = {
  title: string;
  url: string;
  description: string;
};

export type RssPost = {
  title: string;
  description: string;
  url: string;
  timestamp: number;
  feed: RssFeed;
};

const UPDATE_EVERY = 1000 * 60 * 30;
const CHECK_INTERVAL = 1000 * 60;

type FeedsInStorage = Record<
  string,
  {
    feed: RssFeed;
    posts: RssPost[];
  }
>;

export type WidgetStorage = {
  feeds: FeedsInStorage;
  feedUrls: string[];
  lastUpdated: null | number;
};

const arraysAreEqual = (arr1: string[], arr2: string[]) => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

export const fetchFeed = async (url: string) => {
  try {
    const resp = await fetch(url, {
      method: "GET",
      credentials: "omit",
    });
    const text = await resp.text();
    return text;
  } catch (err) {
    console.log("Error getting RSS feed", err);
    return "";
  }
};

const loadAndParseFeeds = async (feedUrls: string[], fetchFeed: (url: string) => Promise<string>) => {
  const parser = await globalParser.get();
  type ParsedOutput = Awaited<ReturnType<typeof parser.parseString>>;
  const parsedFeeds = await Promise.all(
    feedUrls.map(async (url) => {
      try {
        const text = await fetchFeed(url);
        const parsed: ParsedOutput = await parser.parseString(text);
        return {
          url,
          parsed,
        };
      } catch (err) {
        console.log("Error while loading feed", url);
        return undefined;
      }
    }),
  );

  console.log("Parsed feeds", parsedFeeds);
  const newFeeds: FeedsInStorage = {};
  const validFeeds = parsedFeeds.filter(Boolean);
  const postsPerFeed = Math.max(Math.round(100 / validFeeds.length), 10);
  validFeeds.forEach(({ parsed, url }: { url: string; parsed: ParsedOutput }) => {
    const feed: RssFeed = {
      title: parsed.title || "",
      url: parsed.link || "",
      description: parsed.description || "",
    };

    const posts = parsed.items
      .map((item) => {
        return {
          title: item.title || "Without title",
          description: item.contentSnippet || item.content || "",
          url: item.link || "",
          timestamp: moment(item.isoDate || undefined).valueOf(),
          feed,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, postsPerFeed);

    newFeeds[url] = {
      feed,
      posts,
    };
  });

  return newFeeds;
};

export const useRssFeeds = (feedUrls: string[], fetchFeed: (url: string) => Promise<string>) => {
  const refresh = async () => {
    console.log("useRssFeeds.refresh", feedUrls);
    setIsRefreshing(true);

    try {
      const newFeeds = await loadAndParseFeeds(feedUrls, fetchFeed);
      setFeeds(newFeeds);
      storage.set("feedUrls", feedUrls);
      setLastUpdated(Date.now());
    } catch (err) {
      console.log("Error while parsing rss feeds", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const storage = useWidgetStorage<WidgetStorage>();
  const { i18n } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [feeds, setFeeds] = storage.useValue("feeds", {});
  const [lastUpdated, setLastUpdated, lastUpdatedMeta] = storage.useValue("lastUpdated", null);

  const consolidatedFeed = useMemo(() => {
    return Object.values(feeds)
      .map((f) => f.posts)
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [feeds]);
  const lastUpdatedMoment = useMemo(() => moment(lastUpdated), [lastUpdated, i18n.language]);

  useEffect(() => {
    const tid = setInterval(() => {
      if (lastUpdated && lastUpdated + UPDATE_EVERY < Date.now()) {
        refresh();
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(tid);
  }, [lastUpdated]);

  useEffect(() => {
    const main = async () => {
      await storage.waitForLoad();
      const cachedFeedsUrls = storage.get("feedUrls");
      const lastUpdated = storage.get("lastUpdated");

      if (
        !lastUpdated ||
        !cachedFeedsUrls ||
        !arraysAreEqual(cachedFeedsUrls, feedUrls) ||
        lastUpdated + UPDATE_EVERY < Date.now()
      ) {
        refresh();
      }
    };

    main();
  }, [feedUrls]);

  return {
    feed: consolidatedFeed,
    lastUpdated: lastUpdated ? lastUpdatedMoment : undefined,
    isRefreshing,
    refresh,
  };
};

export const updateFeedsForWidget = async (feeds: string[], widgetStorage: NamespacedStorage<WidgetStorage>) => {
  const newFeeds = await loadAndParseFeeds(feeds, fetchFeed);
  widgetStorage.set("feeds", newFeeds);
  widgetStorage.set("feedUrls", feeds);
  widgetStorage.set("lastUpdated", Date.now());
};
