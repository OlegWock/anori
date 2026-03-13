import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { weatherWidgetDescriptorCurrent, weatherWidgetDescriptorForecast } from "./widgets/descriptors";

export { weatherWidgetDescriptorCurrent, weatherWidgetDescriptorForecast };

export const weatherPlugin = definePlugin({
  id: "weather-plugin",
  get name() {
    return translate("weather-plugin.name");
  },
  icon: builtinIcons.weather.partlyCloudy,
  configurationScreen: null,
})
  .withWidgets(weatherWidgetDescriptorCurrent, weatherWidgetDescriptorForecast)
  .build();
