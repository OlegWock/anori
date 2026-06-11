import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { CalendarWidget } from "./CalendarWidget";
import { ConfigScreen } from "./CalendarWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "calendar-m",
  get name() {
    return translate("calendar-plugin.widgetName");
  },
  configurationScreen: ConfigScreen,
  mainScreen: CalendarWidget,
  mock: () => {
    return <CalendarWidget instanceId="mock" config={{}} />;
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
});
