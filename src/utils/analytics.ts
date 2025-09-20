import { allPlugins } from "@anori/plugins/all";
import type { AnalyticEvents, WidgetsCount } from "@anori/utils/analytics-events";
import { detectBrowser } from "@anori/utils/browser";
import { useWidgetMetadata } from "@anori/utils/plugin";
import { themes } from "@anori/utils/user-data/theme";
import type { FolderDetailsInStorage, StorageContent } from "@anori/utils/user-data/types";
import { useCallback } from "react";
import { isBackground } from "webext-detect";
import browser from "webextension-polyfill";
import { getAllCustomIconNames } from "../components/icon/custom-icons";
import { guid, wait } from "./misc";
import { atomWithBrowserStorageStatic, storage } from "./storage/api";

export const analyticsEnabledAtom = atomWithBrowserStorageStatic("analyticsEnabled", false);
const ANALYTICS_TIMEOUT = 1000 * 60 * 60 * 24;

const POSTHOG_ENDPOINT_URL = "https://eu.i.posthog.com/i/v0/e/";
const POSTHOG_API_KEY = "phc_K159gMq9zFXnfVlrfbr7vLf866l6hY8VViB01m1LBj2";

const AMPLITUDE_ENDPOINT_URL = "https://api.eu.amplitude.com/2/httpapi";
const AMPLITUDE_API_KEY = "72ae9510d3106a53608bae9afbb2e8ba";

const getUserId = async () => {
  let userId = await storage.getOne("userId");
  if (!userId) {
    userId = guid();
    await storage.setOne("userId", userId);
  }

  return userId;
};

export const plantPerformanceMetricsListeners = async () => {
  const { analyticsEnabled } = await storage.get({ analyticsEnabled: false });
  if (!analyticsEnabled) {
    return;
  }

  // LCP
  const perfObserver = new PerformanceObserver(async (list) => {
    const lcpEntry = list.getEntries().at(-1) as LargestContentfulPaint | undefined;
    console.log("LCP entry", lcpEntry?.renderTime);
    if (lcpEntry) {
      perfObserver.disconnect();
      const { performanceAvgLcp } = await storage.get({ performanceAvgLcp: { n: 0, avg: 0 } });
      const n = performanceAvgLcp.n ?? 0;
      const avg = performanceAvgLcp.avg ?? 0;
      // Rolling average
      await storage.set({
        performanceAvgLcp: {
          n: n + 1,
          avg: avg + ((lcpEntry.renderTime - avg) / n + 1),
        },
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
        const { performanceRawInp } = await storage.get({ performanceRawInp: [] });
        await storage.set({ performanceRawInp: [...performanceRawInp, ...values] });
        latest.clear();
      }
    }, 200);
    // @ts-expect-error Prop is missing in TS types, but it's real
  }).observe({ type: "event", buffered: true, durationThreshold: 8 });
};

export const incrementDailyUsageMetric = async (name: keyof StorageContent["dailyUsageMetrics"]) => {
  if (isBackground()) {
    const { dailyUsageMetrics, analyticsEnabled } = await storage.get({
      dailyUsageMetrics: {},
      analyticsEnabled: false,
    });
    if (!analyticsEnabled) {
      return;
    }
    dailyUsageMetrics[name] = (dailyUsageMetrics[name] ?? 0) + 1;
    await storage.setOne("dailyUsageMetrics", dailyUsageMetrics);
  } else {
    return browser.runtime.sendMessage({ type: "increment-daily-usage-metric", name });
  }
};

const gatherUsedWidgetsCount = async (): Promise<WidgetsCount> => {
  const { folders } = await storage.get({ folders: [] });

  const foldersQuery: Record<string, FolderDetailsInStorage> = Object.fromEntries(
    folders.map((f) => [
      f.name,
      {
        widgets: [],
      },
    ]),
  );

  const folderDetails = await storage.getDynamic<Record<string, FolderDetailsInStorage>>({
    ...foldersQuery,
    "Folder.home": { widgets: [] },
  });

  const widgetsCount: WidgetsCount = {};

  allPlugins.forEach((plugin) => {
    const widgets = plugin.widgets.flatMap((widgetOrGroup) =>
      Array.isArray(widgetOrGroup) ? widgetOrGroup : [widgetOrGroup],
    );

    widgets.forEach((wd) => {
      widgetsCount[`Home folder widgets / ${plugin.id} / ${wd.id}`] = 0;
      widgetsCount[`Custom folder widgets / ${plugin.id} / ${wd.id}`] = 0;
    });
  });

  Object.entries(folderDetails).forEach(([key, { widgets }]) => {
    const isHome = key === "Folder.home";
    widgets.forEach((wd) => {
      const propName = `${isHome ? "Home" : "Custom"} folder widgets / ${wd.pluginId} / ${wd.widgetId}` as const;
      widgetsCount[propName] += 1;
    });
  });

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
  const folders = (await storage.getOne("folders")) || [];
  const numberOfCustomFolders = folders.length;

  const customIcons = await getAllCustomIconNames();
  const numberOfCustomIcons = customIcons.length;

  const {
    sidebarOrientation,
    autoHideSidebar,
    theme: usedTheme,
    language,
    showBookmarksBar,
    compactMode,
    automaticCompactMode,
    showLoadAnimation,
    dailyUsageMetrics,
    performanceAvgLcp,
    performanceRawInp,
  } = await storage.get({
    sidebarOrientation: "auto",
    autoHideSidebar: false,
    theme: "Greenery",
    language: "en",
    showBookmarksBar: false,
    compactMode: false,
    automaticCompactMode: false,
    showLoadAnimation: false,
    dailyUsageMetrics: {},
    performanceAvgLcp: { avg: 0, n: 0 },
    performanceRawInp: [],
  });

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
  const enabled = await storage.getOne("analyticsEnabled");
  if (!enabled) return;

  const lastSend = await storage.getOne("analyticsLastSend");
  if (lastSend && lastSend + ANALYTICS_TIMEOUT > Date.now() && !skipTimeout) return;

  const data = await gatherDailyUsageData();

  await trackEvent("Usage statistics", data);
  await storage.set({
    analyticsLastSend: Date.now(),
    dailyUsageMetrics: {},
    performanceAvgLcp: { n: 0, avg: 0 },
    performanceRawInp: [],
  });
};

type TrackEventParams<K extends keyof AnalyticEvents> = AnalyticEvents[K] extends Record<string, never>
  ? [eventName: K]
  : [eventName: K, props: AnalyticEvents[K]];
export async function trackEvent<K extends keyof AnalyticEvents>(...params: TrackEventParams<K>): Promise<void>;
export async function trackEvent<K extends keyof AnalyticEvents>(eventName: K, props = {}) {
  if (isBackground()) {
    if (X_MODE === "development") {
      console.log("Tracked event", eventName, props);
      return;
    }

    const enabled = await storage.getOne("analyticsEnabled");
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
