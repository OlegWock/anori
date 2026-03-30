import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import type { City, Speed, Temperature } from "./api";

export const formatCityLabel = (c: City) => {
  const admin = [c.admin4, c.admin3, c.admin2, c.admin1, c.country].filter((a) => !!a).join(", ");
  return `${c.name} (${admin})`;
};

export const formatTemperature = (valueInCelsius: number, to: Temperature, withUnit = true): string => {
  if (to === "c") return Math.round(valueInCelsius) + (withUnit ? " °C" : "");
  return Math.round(valueInCelsius * (9 / 5) + 32) + (withUnit ? " °F" : "");
};

export const formatSpeed = (speedInKmPerHour: number, to: Speed): string => {
  if (to === "km/h") return `${speedInKmPerHour.toFixed(1)} ${translate("weather-plugin.kmh")}`;
  if (to === "m/s") return `${Math.round(speedInKmPerHour * (5 / 18))} ${translate("weather-plugin.ms")}`;
  return `${(speedInKmPerHour * 0.6213).toFixed(1)} ${translate("weather-plugin.mph")}`;
};

export const weatherCodeToIcon = (code: number) => {
  if (code === 0) return builtinIcons.weather.sunny;
  if ([1, 2, 3].includes(code)) return builtinIcons.weather.partlyCloudy;
  if ([45, 48].includes(code)) return builtinIcons.weather.fog;
  if ([51, 53, 55].includes(code)) return builtinIcons.weather.showers;
  if ([56, 57].includes(code)) return builtinIcons.weather.rainMix;
  if ([61, 63, 65].includes(code)) return builtinIcons.weather.rain;
  if ([66, 67].includes(code)) return builtinIcons.weather.rainMix;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return builtinIcons.weather.snow;
  if ([80, 81, 82].includes(code)) return builtinIcons.weather.rain;
  if ([95, 96, 99].includes(code)) return builtinIcons.weather.thunderstorm;

  return builtinIcons.weather.cloud;
};

export const weatherCodeDescription = (code: number) => {
  if (code === 0) return translate("weather-plugin.clearSky");
  if ([1, 2, 3].includes(code)) return translate("weather-plugin.partlyCloudy");
  if ([45, 48].includes(code)) return translate("weather-plugin.fog");
  if ([51, 53, 55].includes(code)) return translate("weather-plugin.drizzle");
  if ([56, 57].includes(code)) return translate("weather-plugin.freezingDrizzle");
  if ([61, 63, 65].includes(code)) return translate("weather-plugin.rain");
  if ([66, 67].includes(code)) return translate("weather-plugin.freezingRain");
  if ([71, 73, 75, 77, 85, 86].includes(code)) return translate("weather-plugin.snow");
  if ([80, 81, 82].includes(code)) return translate("weather-plugin.rainShower");
  if ([95, 96, 99].includes(code)) return translate("weather-plugin.thunderstorm");

  return translate("weather-plugin.unknownCode");
};

export const CACHE_TIME = 1000 * 60 * 20;
export const CHECK_INTERVAL = 1000 * 60;
