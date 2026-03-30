import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { MainScreenCurrent, mockCity } from "./CurrentWeatherWidget";
import { MainScreenForecast } from "./ForecastWeatherWidget";
import { WeatherWidgetConfigScreen } from "./WeatherWidgetConfig";

export const weatherWidgetDescriptorCurrent = defineWidget({
  id: "weather-current",
  get name() {
    return translate("weather-plugin.currentWeather");
  },
  configurationScreen: WeatherWidgetConfigScreen,
  mainScreen: MainScreenCurrent,
  mock: () => {
    return (
      <MainScreenCurrent instanceId="mock" config={{ location: mockCity, temperatureUnit: "c", speedUnit: "km/h" }} />
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
  configurationScreen: WeatherWidgetConfigScreen,
  mainScreen: MainScreenForecast,
  mock: () => {
    return (
      <MainScreenForecast instanceId="mock" config={{ location: mockCity, temperatureUnit: "c", speedUnit: "km/h" }} />
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
