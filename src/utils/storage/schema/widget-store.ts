import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TasksWidgetStoreSchema = z.object({
  tasks: z.array(TaskSchema),
});

export type TasksWidgetStore = z.infer<typeof TasksWidgetStoreSchema>;

export const NotesWidgetStoreSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type NotesWidgetStore = z.infer<typeof NotesWidgetStoreSchema>;

export const WeatherCurrentWidgetStoreSchema = z.object({
  weather: z.object({
    temperature: z.number(),
    windSpeed: z.number(),
    windDirection: z.number(),
    weatherCode: z.number(),
    lastUpdated: z.number(),
  }),
});

export type WeatherCurrentWidgetStore = z.infer<typeof WeatherCurrentWidgetStoreSchema>;

export const WeatherForecastItemSchema = z.object({
  dateRaw: z.string(),
  windSpeed: z.number(),
  windDirection: z.number(),
  weatherCode: z.number(),
  temperatureMin: z.number(),
  temperatureMax: z.number(),
});

export const WeatherForecastWidgetStoreSchema = z.object({
  weather: z.object({
    forecast: z.array(WeatherForecastItemSchema),
    lastUpdated: z.number(),
  }),
});

export type WeatherForecastWidgetStore = z.infer<typeof WeatherForecastWidgetStoreSchema>;

export const TopSitesWidgetStoreSchema = z.object({
  blacklist: z.array(z.string()),
});

export type TopSitesWidgetStore = z.infer<typeof TopSitesWidgetStoreSchema>;

export const RssFeedSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string(),
});

export const RssPostSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  timestamp: z.number(),
  feed: RssFeedSchema,
});

export const RssWidgetStoreSchema = z.object({
  feeds: z.record(
    z.string(),
    z.object({
      feed: RssFeedSchema,
      posts: z.array(RssPostSchema),
    }),
  ),
  feedUrls: z.array(z.string()),
  lastUpdated: z.number().nullable(),
});

export type RssWidgetStore = z.infer<typeof RssWidgetStoreSchema>;
export type RssFeed = z.infer<typeof RssFeedSchema>;
export type RssPost = z.infer<typeof RssPostSchema>;

export const BookmarkWidgetStoreSchema = z.object({
  status: z.enum(["up", "down", "loading"]),
  lastCheck: z.number().optional(),
  lastStatusChange: z.number().optional(),
});

export type BookmarkWidgetStore = z.infer<typeof BookmarkWidgetStoreSchema>;
