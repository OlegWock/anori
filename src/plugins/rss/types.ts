import { z } from "zod";

export const rssFeedConfigSchema = z.object({
  title: z.string(),
  feedUrls: z.array(z.string()),
  compactView: z.boolean().default(false),
});
export type RssFeedConfig = z.infer<typeof rssFeedConfigSchema>;

export const rssLatestPostConfigSchema = z.object({
  feedUrl: z.string(),
});
export type RssLatestPostConfig = z.infer<typeof rssLatestPostConfigSchema>;

export type RssMessageHandlers = {
  getFeedText: {
    args: {
      url: string;
    };
    result: string;
  };
};
