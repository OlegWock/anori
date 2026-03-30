export type RssFeedConfig = {
  title: string;
  feedUrls: string[];
  compactView?: boolean;
};

export type RssLatestPostConfig = {
  feedUrl: string;
};

export type RssMessageHandlers = {
  getFeedText: {
    args: {
      url: string;
    };
    result: string;
  };
};
