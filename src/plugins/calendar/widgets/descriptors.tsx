import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { MainScreen } from "./CalendarWidget";
import { ConfigScreen } from "./CalendarWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "calendar-m",
  get name() {
    return translate("calendar-plugin.widgetName");
  },
  configurationScreen: ConfigScreen,
  mainScreen: MainScreen,
  mock: () => {
    return <MainScreen instanceId="mock" config={{}} />;
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
});
