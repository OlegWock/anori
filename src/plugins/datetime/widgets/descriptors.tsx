import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import type { WidgetConfigurationScreenProps, WidgetRenderProps } from "@anori/utils/plugins/types";
import type { DatetimeWidgetConfig } from "../types";
import { WidgetScreen } from "./DatetimeWidget";
import { ConfigScreen } from "./DatetimeWidgetConfig";

export const datetimeWidgetDescriptorS = defineWidget({
  id: "datetime-widget",
  get name() {
    return translate("datetime-plugin.widgetNameS");
  },
  appearance: {
    resizable: false,
    size: {
      width: 1,
      height: 1,
    },
  },
  configurationScreen: (props: WidgetConfigurationScreenProps<DatetimeWidgetConfig>) => (
    <ConfigScreen size="s" {...props} />
  ),
  mainScreen: (props: WidgetRenderProps<DatetimeWidgetConfig>) => <WidgetScreen size="s" {...props} />,
  mock: () => (
    <WidgetScreen
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
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
  configurationScreen: (props: WidgetConfigurationScreenProps<DatetimeWidgetConfig>) => (
    <ConfigScreen size="m" {...props} />
  ),
  mainScreen: (props: WidgetRenderProps<DatetimeWidgetConfig>) => <WidgetScreen size="m" {...props} />,
  mock: () => (
    <WidgetScreen
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
