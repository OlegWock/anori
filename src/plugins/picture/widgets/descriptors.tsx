import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { PictureWidget } from "./PictureWidget";
import { PictureConfigScreen } from "./PictureWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "widget",
  get name() {
    return translate("picture-plugin.widgetName");
  },
  configurationScreen: PictureConfigScreen,
  mainScreen: PictureWidget,
  mock: () => {
    return (
      <PictureWidget
        instanceId="mock"
        config={{
          url: "https://picsum.photos/800",
        }}
      />
    );
  },
  appearance: {
    withoutPadding: true,
    size: {
      width: 2,
      height: 2,
    },
    resizable: true,
  },
});
