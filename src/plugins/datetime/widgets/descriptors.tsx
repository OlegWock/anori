import { translate } from "@anori/translations/utils";
import { defineWidget, type WidgetConfigScreenProps, type WidgetRenderProps } from "@anori/utils/plugins/define";
import type { DatetimeWidgetConfig } from "../types";
import { DatetimeWidget } from "./DatetimeWidget";
import { ConfigScreen } from "./DatetimeWidgetConfig";

// TODO: replace the cast with a zod schema for runtime validation (see blueprint for the pattern).
const parse = (raw: unknown) => raw as DatetimeWidgetConfig;

export const datetimeWidgetDescriptorS = defineWidget({
  id: "datetime-widget",
  get name() {
    return translate("datetime-plugin.widgetNameS");
  },
  parse,
  appearance: {
    resizable: {
      min: { width: 1, height: 1 },
      max: { width: 2, height: 1 },
    },
    size: {
      width: 1,
      height: 1,
    },
  },
  configurationScreen: (props: WidgetConfigScreenProps<DatetimeWidgetConfig>) => <ConfigScreen size="s" {...props} />,
  mainScreen: (props: WidgetRenderProps<DatetimeWidgetConfig>) => <DatetimeWidget size="s" {...props} />,
  mock: () => (
    <DatetimeWidget
      config={{
        title: "Bratislava",
        tz: "Europe/Bratislava",
        timeFormat: "HH:mm",
        dateFormat: "Do MMM Y",
      }}
      instanceId="mock"
      size="s"
    />
  ),
});

export const datetimeWidgetDescriptorM = defineWidget({
  id: "datetime-widget-m",
  get name() {
    return translate("datetime-plugin.widgetNameM");
  },
  parse,
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
  configurationScreen: (props: WidgetConfigScreenProps<DatetimeWidgetConfig>) => <ConfigScreen size="m" {...props} />,
  mainScreen: (props: WidgetRenderProps<DatetimeWidgetConfig>) => <DatetimeWidget size="m" {...props} />,
  mock: () => (
    <DatetimeWidget
      config={{
        title: "Bratislava",
        tz: "Europe/Bratislava",
        timeFormat: "HH:mm:ss",
        dateFormat: "Do MMMM Y",
      }}
      instanceId="mock"
      size="m"
    />
  ),
});
