import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { calendarWidgetConfigSchema } from "../types";
import { CalendarWidget } from "./CalendarWidget";
import { ConfigScreen } from "./CalendarWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "calendar-m",
  get name() {
    return translate("calendar-plugin.widgetName");
  },
  schema: calendarWidgetConfigSchema,
  configurationScreen: ConfigScreen,
  mainScreen: CalendarWidget,
  mock: () => {
    return <CalendarWidget instanceId="mock" config={{ firstDay: 0, calendar: "gregory" }} />;
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
});
