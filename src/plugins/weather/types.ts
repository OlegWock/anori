import type { City, Speed, Temperature } from "./api";

export type WeatherWidgetConfig = {
  location: City;
  temperatureUnit: Temperature;
  speedUnit: Speed;
};
