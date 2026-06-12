import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { weatherWidgetConfigSchema } from "../types";
import { CurrentWeatherWidget, mockCity } from "./CurrentWeatherWidget";
import { ForecastWeatherWidget } from "./ForecastWeatherWidget";
import { WeatherWidgetConfigScreen } from "./WeatherWidgetConfig";

export const weatherWidgetDescriptorCurrent = defineWidget({
  id: "weather-current",
  get name() {
    return translate("weather-plugin.currentWeather");
  },
  schema: weatherWidgetConfigSchema,
  configurationScreen: WeatherWidgetConfigScreen,
  mainScreen: CurrentWeatherWidget,
  mock: () => {
    return (
      <CurrentWeatherWidget
        instanceId="mock"
        config={{ location: mockCity, temperatureUnit: "c", speedUnit: "km/h" }}
      />
    );
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 1,
    },
  },
});

export const weatherWidgetDescriptorForecast = defineWidget({
  id: "weather-forecast",
  get name() {
    return translate("weather-plugin.weatherForecast");
  },
  schema: weatherWidgetConfigSchema,
  configurationScreen: WeatherWidgetConfigScreen,
  mainScreen: ForecastWeatherWidget,
  mock: () => {
    return (
      <ForecastWeatherWidget
        instanceId="mock"
        config={{ location: mockCity, temperatureUnit: "c", speedUnit: "km/h" }}
      />
    );
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 4,
    },
  },
});
