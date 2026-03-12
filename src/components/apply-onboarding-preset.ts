import { bookmarkPlugin, bookmarkWidgetDescriptor } from "@anori/plugins/bookmark/bookmark-plugin";
import { datetimePlugin, datetimeWidgetDescriptorS } from "@anori/plugins/datetime/datetime-plugin";
import { notesPlugin, notesWidgetDescriptor } from "@anori/plugins/notes/notes-plugin";
import { rssFeedDescriptor, rssPlugin } from "@anori/plugins/rss/rss-plugin";
import { tasksPlugin, tasksWidgetDescriptor } from "@anori/plugins/tasks/tasks-plugin";
import { topSitesPlugin, topSitesWidgetDescriptorVertical } from "@anori/plugins/top-sites/top-sites-plugin";
import { weatherPlugin, weatherWidgetDescriptorCurrent } from "@anori/plugins/weather/weather-plugin";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { canPlaceItemInGrid } from "@anori/utils/grid/utils";
import { getIpInfo } from "@anori/utils/network";
import type { AnoriPlugin, ConfigFromWidgetDescriptor, WidgetDescriptor } from "@anori/utils/plugins/types";
import type { Mapping } from "@anori/utils/types";
import type { TFunction } from "i18next";

export const applyOnboardingPreset = async ({
  t,
  gridDimensions,
  addWidget,
}: {
  t: TFunction;
  gridDimensions: GridDimensions;
  addWidget: (args: {
    plugin: AnoriPlugin<string, Mapping, WidgetDescriptor[]>;
    widget: WidgetDescriptor;
    config: Record<string, unknown>;
    position: GridPosition;
    size?: GridItemSize;
  }) => void;
}) => {
  const addIfPossible = <WD extends WidgetDescriptor[], W extends WD[number]>({
    plugin,
    widget,
    config,
    position,
    size,
  }: {
    plugin: AnoriPlugin<string, Mapping, WD>;
    widget: W;
    config: ConfigFromWidgetDescriptor<W>;
    position: GridPosition;
    size?: GridItemSize;
  }) => {
    if (
      canPlaceItemInGrid({
        grid: gridDimensions,
        layout: [],
        item: widget.appearance.size,
        position,
      })
    ) {
      addWidget({
        plugin,
        widget,
        config,
        position,
        size,
      });
    }
  };

  console.log("Applying preset");
  const ipInfo = await getIpInfo();
  console.log("Ip info", ipInfo);

  const shouldAddTopSites = canPlaceItemInGrid({
    grid: gridDimensions,
    layout: [],
    item: topSitesWidgetDescriptorVertical.appearance.size,
    position: { x: 0, y: 0 },
  });

  const compensationForTopSites = shouldAddTopSites ? 0 : -1;

  if (shouldAddTopSites) {
    addWidget({
      plugin: topSitesPlugin,
      widget: topSitesWidgetDescriptorVertical,
      config: {},
      position: {
        x: 0,
        y: 0,
      },
    });
  }

  addIfPossible({
    plugin: tasksPlugin,
    widget: tasksWidgetDescriptor,
    config: {
      title: t("tasks-plugin.todo"),
    },
    position: {
      x: 1 + compensationForTopSites,
      y: 1,
    },
  });
  addIfPossible({
    plugin: bookmarkPlugin,
    widget: bookmarkWidgetDescriptor,
    config: {
      url: "https://www.reddit.com/",
      title: "Reddit",
      icon: "logos:reddit-icon",
    },
    size: {
      width: 2,
      height: 1,
    },
    position: {
      x: 1 + compensationForTopSites,
      y: 3,
    },
  });
  addIfPossible({
    plugin: bookmarkPlugin,
    widget: bookmarkWidgetDescriptor,
    config: {
      url: "https://twitter.com/",
      title: "Twitter",
      icon: "logos:twitter",
    },
    position: {
      x: 3 + compensationForTopSites,
      y: 1,
    },
  });
  addIfPossible({
    plugin: bookmarkPlugin,
    widget: bookmarkWidgetDescriptor,
    config: {
      url: "https://www.instagram.com/",
      title: "Instagram",
      icon: "skill-icons:instagram",
    },
    position: {
      x: 4 + compensationForTopSites,
      y: 1,
    },
  });

  addIfPossible({
    plugin: notesPlugin,
    widget: notesWidgetDescriptor,
    config: {},
    position: {
      x: 3 + compensationForTopSites,
      y: 2,
    },
    size: {
      width: 2,
      height: 2,
    },
  });

  addIfPossible({
    plugin: rssPlugin,
    widget: rssFeedDescriptor,
    config: {
      title: t("rss-plugin.presetInterestingTitle"),
      feedUrls: [
        "https://nesslabs.com/feed",
        "https://ciechanow.ski/atom.xml",
        "https://maggieappleton.com/rss.xml",
        "https://www.youtube.com/feeds/videos.xml?channel_id=UCj1VqrHhDte54oLgPG4xpuQ",
      ],
    },
    position: {
      x: 5 + compensationForTopSites,
      y: 0,
    },
  });

  addIfPossible({
    plugin: datetimePlugin,
    widget: datetimeWidgetDescriptorS,
    config: {
      title: ipInfo.city,
      tz: ipInfo.timezone,
      timeFormat: "HH:mm",
      dateFormat: "Do MMM Y",
    },
    position: {
      x: 5 + compensationForTopSites,
      y: 3,
    },
  });

  if (ipInfo.lat !== undefined && ipInfo.long !== undefined) {
    addIfPossible({
      plugin: weatherPlugin,
      widget: weatherWidgetDescriptorCurrent,
      config: {
        location: {
          id: 0,
          country: ipInfo.country,
          name: ipInfo.city,
          latitude: ipInfo.lat,
          longitude: ipInfo.long,
        },
        temperatureUnit: "c",
        speedUnit: "km/h",
      },
      position: {
        x: 6 + compensationForTopSites,
        y: 3,
      },
    });
  }
};
