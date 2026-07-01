import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { ankiPluginWidgetConfigSchema } from "../types";
import { AnkiWidget, AnkiWidgetMock } from "./AnkiWidget";
import { WidgetConfigScreen } from "./AnkiWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "anki-widget",
  get name() {
    return translate("anki-plugin.widgetName");
  },
  schema: ankiPluginWidgetConfigSchema,
  configurationScreen: WidgetConfigScreen,
  mainScreen: AnkiWidget,
  mock: AnkiWidgetMock,
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
