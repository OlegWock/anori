import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { MainScreen, MockScreen } from "./AnkiWidget";
import { WidgetConfigScreen } from "./AnkiWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "anki-widget",
  get name() {
    return translate("anki-plugin.widgetName");
  },
  configurationScreen: WidgetConfigScreen,
  mainScreen: MainScreen,
  mock: MockScreen,
  appearance: {
    size: {
      width: 2,
      height: 2,
    },
    resizable: {
      min: {
        width: 2,
        height: 2,
      },
      max: {
        width: 4,
        height: 4,
      },
    },
  },
});
