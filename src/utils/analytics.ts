import { allPlugins } from "@anori/plugins/all";
import type { AnalyticEvents, WidgetsCount } from "@anori/utils/analytics-events";
import { detectBrowser } from "@anori/utils/browser";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import type { EmptyObject } from "@anori/utils/types";
import { themes } from "@anori/utils/user-data/theme";
import type { StorageContent } from "@anori/utils/user-data/types";
import { useCallback } from "react";
import { isBackground } from "webext-detect";
import browser from "webextension-polyfill";
import { getAllCustomIconNames } from "../components/icon/custom-icons";
import { guid, wait } from "./misc";

const ANALYTICS_TIMEOUT = 1000 * 60 * 60 * 24;

const POSTHOG_ENDPOINT_URL = "https://eu.i.posthog.com/i/v0/e/";
const POSTHOG_API_KEY = "phc_K159gMq9zFXnfVlrfbr7vLf866l6hY8VViB01m1LBj2";

const AMPLITUDE_ENDPOINT_URL = "https://api.eu.amplitude.com/2/httpapi";
const AMPLITUDE_API_KEY = "72ae9510d3106a53608bae9afbb2e8ba";

const getUserId = async () => {
  const storage = await getAnoriStorage();
  let userId = storage.get(anoriSchema.userId);
  if (!userId) {
    userId = guid();
    await storage.set(anoriSchema.userId, userId);
  }

  return userId;
};

export const plantPerformanceMetricsListeners = async () => {
  const storage = await getAnoriStorage();
  const analyticsEnabled = storage.get(anoriSchema.analyticsEnabled);
  if (!analyticsEnabled) {
    return;
  }

  // LCP
  const perfObserver = new PerformanceObserver(async (list) => {
    const lcpEntry = list.getEntries().at(-1) as LargestContentfulPaint | undefined;
    console.log("LCP entry", lcpEntry?.renderTime);
    if (lcpEntry) {
      perfObserver.disconnect();
      const performanceAvgLcp = storage.get(anoriSchema.performanceAvgLcp);
      const n = performanceAvgLcp.n;
      const avg = performanceAvgLcp.avg;
      // Rolling average
      await storage.set(anoriSchema.performanceAvgLcp, {
        n: n + 1,
        avg: avg + (lcpEntry.startTime - avg) / (n + 1),
      });
    }
  });
  perfObserver.observe({ type: "largest-contentful-paint", buffered: true });

  // INP
  const latest = new Map<number, number>(); // interactionId → longest duration
  let idleTimer: ReturnType<typeof setTimeout>;
  new PerformanceObserver((list) => {
    for (const _entry of list.getEntries()) {
      const entry = _entry as PerformanceEventTiming;
      // @ts-expect-error Prop is missing in TS types, but it's real
      const interactionId = entry.interactionId as number;
      if (!interactionId) continue; // ignore non-interaction events
      const d = latest.get(interactionId) || 0;
      if (entry.duration > d) latest.set(interactionId, entry.duration);
    }
    // 200ms debounce
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      const values = [...latest.values()];
      if (values.length) {
        console.log("INP entries", values);
        const performanceRawInp = storage.get(anoriSchema.performanceRawInp);
        await storage.set(anoriSchema.performanceRawInp, [...performanceRawInp, ...values]);
        latest.clear();
      }
    }, 200);
    // @ts-expect-error Prop is missing in TS types, but it's real
  }).observe({ type: "event", buffered: true, durationThreshold: 8 });
};

export const incrementDailyUsageMetric = async (name: keyof StorageContent["dailyUsageMetrics"]) => {
  if (isBackground()) {
    const storage = await getAnoriStorage();
    const analyticsEnabled = storage.get(anoriSchema.analyticsEnabled);
    if (!analyticsEnabled) {
      return;
    }
    const dailyUsageMetrics = storage.get(anoriSchema.dailyUsageMetrics);
    dailyUsageMetrics[name] = (dailyUsageMetrics[name] ?? 0) + 1;
    await storage.set(anoriSchema.dailyUsageMetrics, dailyUsageMetrics);
  } else {
    return browser.runtime.sendMessage({ type: "increment-daily-usage-metric", name });
  }
};

const gatherUsedWidgetsCount = async (): Promise<WidgetsCount> => {
  const storage = await getAnoriStorage();
  const folders = storage.get(anoriSchema.folders);

  const widgetsCount: WidgetsCount = {};

  allPlugins.forEach((plugin) => {
    plugin.widgets.forEach((wd) => {
      widgetsCount[`Home folder widgets / ${plugin.id} / ${wd.id}`] = 0;
      widgetsCount[`Custom folder widgets / ${plugin.id} / ${wd.id}`] = 0;
    });
  });

  const allFolderIds = ["home", ...folders.map((f) => f.id)];

  for (const folderId of allFolderIds) {
    const isHome = folderId === "home";
    const details = storage.get(anoriSchema.folderDetails.folder.byId(folderId));
    const widgets = details?.widgets ?? [];

    widgets.forEach((wd) => {
      const propName = `${isHome ? "Home" : "Custom"} folder widgets / ${wd.pluginId} / ${wd.widgetId}` as const;
      widgetsCount[propName] += 1;
    });
  }

  return widgetsCount;
};

const aggregateInp = (values: number[]) => {
  if (values.length === 0) return null;

  // < 50 interactions → take the worst
  if (values.length < 50) return Math.max(...values);

  // ≥ 50 interactions → 98-th percentile
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil(values.length * 0.98) - 1;
  return sorted[rank];
};

const gatherDailyUsageData = async (): Promise<AnalyticEvents["Usage statistics"]> => {
  const storage = await getAnoriStorage();

  const folders = storage.get(anoriSchema.folders);
  const numberOfCustomFolders = folders.length;

  const customIcons = await getAllCustomIconNames();
  const numberOfCustomIcons = customIcons.length;

  const sidebarOrientation = storage.get(anoriSchema.sidebarOrientation);
  const autoHideSidebar = storage.get(anoriSchema.autoHideSidebar);
  const usedTheme = storage.get(anoriSchema.theme);
  const language = storage.get(anoriSchema.language);
  const showBookmarksBar = storage.get(anoriSchema.showBookmarksBar);
  const compactMode = storage.get(anoriSchema.compactMode);
  const automaticCompactMode = storage.get(anoriSchema.automaticCompactMode);
  const showLoadAnimation = storage.get(anoriSchema.showLoadAnimation);
  const dailyUsageMetrics = storage.get(anoriSchema.dailyUsageMetrics);
  const performanceAvgLcp = storage.get(anoriSchema.performanceAvgLcp);
  const performanceRawInp = storage.get(anoriSchema.performanceRawInp);

  const { os } = await browser.runtime.getPlatformInfo();
  const extVersion = browser.runtime.getManifest().version;

  return {
    "Browser": detectBrowser(),
    "Operational system": os,
    "Extension version": extVersion,
    "Custom icons count": numberOfCustomIcons,
    "Custom folders count": numberOfCustomFolders,
    "Sidebar orientation": sidebarOrientation,
    "Automatically hide sidebar enabled": autoHideSidebar,
    "Bookmarks bar enabled": showBookmarksBar,
    "Compact mode": automaticCompactMode ? "auto" : compactMode ? "enabled" : "disabled",
    "Open animation enabled": showLoadAnimation,
    "Language": language,
    "Theme": themes.find((t) => t.name === usedTheme) ? usedTheme : "custom",
    "Performance / Avg LCP": performanceAvgLcp.avg || null,
    "Performance / INP": aggregateInp(performanceRawInp),
    ...dailyUsageMetrics,
    ...(await gatherUsedWidgetsCount()),
  };
};

// @ts-ignore
self.gatherDailyUsageData = gatherDailyUsageData;

export const sendAnalyticsIfEnabled = async (skipTimeout = false) => {
  const storage = await getAnoriStorage();

  const enabled = storage.get(anoriSchema.analyticsEnabled);
  if (!enabled) return;

  const lastSend = storage.get(anoriSchema.analyticsLastSend);
  if (lastSend && lastSend + ANALYTICS_TIMEOUT > Date.now() && !skipTimeout) return;

  const data = await gatherDailyUsageData();

  await trackEvent("Usage statistics", data);
  await storage.set(anoriSchema.analyticsLastSend, Date.now());
  await storage.set(anoriSchema.dailyUsageMetrics, {});
  await storage.set(anoriSchema.performanceAvgLcp, { n: 0, avg: 0 });
  await storage.set(anoriSchema.performanceRawInp, []);
};

type TrackEventParams<K extends keyof AnalyticEvents> = AnalyticEvents[K] extends EmptyObject
  ? [eventName: K]
  : [eventName: K, props: AnalyticEvents[K]];
export async function trackEvent<K extends keyof AnalyticEvents>(...params: TrackEventParams<K>): Promise<void>;
export async function trackEvent<K extends keyof AnalyticEvents>(eventName: K, props = {}) {
  if (isBackground()) {
    if (X_MODE === "development") {
      console.log("Tracked event", eventName, props);
      return;
    }

    const storage = await getAnoriStorage();
    const enabled = storage.get(anoriSchema.analyticsEnabled);
    if (!enabled) return;
    const userId = await getUserId();

    const promisePosthog = fetch(POSTHOG_ENDPOINT_URL, {
      method: "POST",
      headers: { accept: "text/plain", "content-type": "application/json" },
      mode: "no-cors",
      credentials: "omit",
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event: eventName,
        properties: {
          distinct_id: userId,
          ...props,
        },
      }),
    });

    const promiseAmplitude = fetch(AMPLITUDE_ENDPOINT_URL, {
      method: "POST",
      headers: { accept: "text/plain", "content-type": "application/json" },
      mode: "no-cors",
      credentials: "omit",
      body: JSON.stringify({
        api_key: AMPLITUDE_API_KEY,
        events: [
          {
            user_id: userId,
            event_type: eventName,
            ip: "$remote",
            event_properties: props,
          },
        ],
      }),
    });

    const combined = Promise.allSettled([promiseAmplitude, promisePosthog]);

    return Promise.race([wait(1000), combined]);
  }

  return browser.runtime.sendMessage({ type: "track-event", eventName, props });
}

export const useWidgetInteractionTracker = () => {
  const ctx = useWidgetMetadata();
  const trackInteraction = useCallback(
    (name: string) => incrementDailyUsageMetric(`Interactions / ${ctx.pluginId} / ${ctx.widgetId} / ${name}`),
    [ctx.pluginId, ctx.widgetId],
  );

  return trackInteraction;
};
