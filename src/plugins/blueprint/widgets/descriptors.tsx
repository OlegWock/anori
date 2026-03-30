import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { BlueprintWidget } from "./BlueprintWidget";
import { BlueprintWidgetConfigScreen } from "./BlueprintWidgetConfig";

export const blueprintWidgetDescriptor = defineWidget({
  id: "widget",
  get name() {
    return translate("blueprint-plugin.widgetName");
  },
  configurationScreen: BlueprintWidgetConfigScreen,
  mainScreen: BlueprintWidget,
  mock: () => {
    return <BlueprintWidget instanceId="mock" config={{ title: "Example", showIcon: true }} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: false,
  },
});
