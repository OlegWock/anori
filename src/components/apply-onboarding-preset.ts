import { calendarPlugin } from "@anori/plugins/calendar/calendar-plugin";
import { widgetDescriptor as calendarWidgetDescriptor } from "@anori/plugins/calendar/widgets/descriptors";
import { datetimePlugin, datetimeWidgetDescriptorM } from "@anori/plugins/datetime/datetime-plugin";
import { mathPlugin } from "@anori/plugins/math/math-plugin";
import { expandableWidgetDescriptor as calcExpandableDescriptor } from "@anori/plugins/math/widgets/descriptors";
import { notesPlugin, notesWidgetDescriptor } from "@anori/plugins/notes/notes-plugin";
import { tasksPlugin, tasksWidgetDescriptor } from "@anori/plugins/tasks/tasks-plugin";
import { topSitesPlugin, topSitesWidgetDescriptorHorizontal } from "@anori/plugins/top-sites/top-sites-plugin";
import {
  weatherPlugin,
  weatherWidgetDescriptorCurrent,
  weatherWidgetDescriptorForecast,
} from "@anori/plugins/weather/weather-plugin";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { canPlaceItemInGrid } from "@anori/utils/grid/utils";
import { guid } from "@anori/utils/misc";
import { getIpInfo } from "@anori/utils/network";
import type { AnoriPlugin, ConfigFromWidgetDescriptor, WidgetDescriptor } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorageNoWait } from "@anori/utils/storage";
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
  }) => Promise<{ instanceId: string }>;
}) => {
  const addIfPossible = async <WD extends WidgetDescriptor[], W extends WD[number]>({
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
        item: size ?? widget.appearance.size,
        position,
      })
    ) {
      return addWidget({
        plugin,
        widget,
        config,
        position,
        size,
      });
    }
    return undefined;
  };

  const storage = getAnoriStorageNoWait();

  console.log("Applying preset");
  const ipInfo = await getIpInfo();
  console.log("Ip info", ipInfo);

  const weatherConfig =
    ipInfo.lat !== undefined && ipInfo.long !== undefined
      ? {
          location: {
            id: 0,
            country: ipInfo.country,
            name: ipInfo.city,
            latitude: ipInfo.lat,
            longitude: ipInfo.long,
          },
          temperatureUnit: "c" as const,
          speedUnit: "km/h" as const,
        }
      : undefined;

  addIfPossible({
    plugin: topSitesPlugin,
    widget: topSitesWidgetDescriptorHorizontal,
    config: {},
    position: { x: 0, y: 0 },
  });

  const tasksWidget = await addIfPossible({
    plugin: tasksPlugin,
    widget: tasksWidgetDescriptor,
    config: {
      title: t("tasks-plugin.todo"),
    },
    position: { x: 4, y: 0 },
  });

  if (tasksWidget) {
    try {
      await storage.set(anoriSchema.tasksWidgetStore.store.byId(tasksWidget.instanceId), {
        tasks: [
          { id: guid(), text: t("onboarding.preset.task.themes") },
          { id: guid(), text: t("onboarding.preset.task.anoriPlus") },
          { id: guid(), text: t("onboarding.preset.task.widgets") },
        ],
      });
    } catch (e) {
      console.warn("Failed to pre-populate tasks", e);
    }
  }

  if (weatherConfig) {
    addIfPossible({
      plugin: weatherPlugin,
      widget: weatherWidgetDescriptorForecast,
      config: weatherConfig,
      position: { x: 6, y: 0 },
    });
  }

  addIfPossible({
    plugin: datetimePlugin,
    widget: datetimeWidgetDescriptorM,
    config: {
      title: ipInfo.city,
      tz: ipInfo.timezone,
      timeFormat: "HH:mm",
      dateFormat: "Do MMM Y",
    },
    position: { x: 0, y: 1 },
  });

  addIfPossible({
    plugin: calendarPlugin,
    widget: calendarWidgetDescriptor,
    config: {},
    position: { x: 2, y: 1 },
  });

  const notesWidget = await addIfPossible({
    plugin: notesPlugin,
    widget: notesWidgetDescriptor,
    config: {},
    position: { x: 4, y: 2 },
    size: { width: 2, height: 2 },
  });
  if (notesWidget) {
    try {
      await storage.set(anoriSchema.notesWidgetStore.store.byId(notesWidget.instanceId), {
        title: "Scratchpad",
        body: "",
      });
    } catch (e) {
      console.warn("Failed to pre-populate notes", e);
    }
  }

  addIfPossible({
    plugin: mathPlugin,
    widget: calcExpandableDescriptor,
    config: {},
    position: { x: 0, y: 3 },
  });

  if (weatherConfig) {
    addIfPossible({
      plugin: weatherPlugin,
      widget: weatherWidgetDescriptorCurrent,
      config: weatherConfig,
      position: { x: 2, y: 3 },
    });
  }
};
