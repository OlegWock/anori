import { Button } from "@anori/components/Button";
import type {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetDescriptor,
  WidgetRenderProps,
} from "@anori/utils/user-data/types";
import { useMemo, useState } from "react";
import "./styles.scss";
import { Combobox } from "@anori/components/Combobox";
import { Tooltip } from "@anori/components/Tooltip";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { Select } from "@anori/components/lazy-components";
import { translate } from "@anori/translations/index";
import { useSizeSettings } from "@anori/utils/compact";
import { dayjs } from "@anori/utils/dayjs";
import { useAsyncEffect, useOnChangeEffect } from "@anori/utils/hooks";
import { useWidgetStorage } from "@anori/utils/plugin";
import { capitalize } from "@anori/utils/strings";
import { FloatingDelayGroup } from "@floating-ui/react";
import { useTranslation } from "react-i18next";
import {
  type City,
  type CurrentWeather,
  type Speed,
  type Temperature,
  type WeatherForecast,
  gerCurrentWeather,
  getForecast,
  searchCity,
} from "./api";

type PluginWidgetConfigType = {
  location: City;
  temperatureUnit: Temperature;
  speedUnit: Speed;
};

const formatCityLabel = (c: City) => {
  const admin = [c.admin4, c.admin3, c.admin2, c.admin1, c.country].filter((a) => !!a).join(", ");
  return `${c.name} (${admin})`;
};

const formatTemperature = (valueInCelsius: number, to: Temperature, withUnit = true): string => {
  if (to === "c") return Math.round(valueInCelsius) + (withUnit ? " °C" : "");
  return Math.round(valueInCelsius * (9 / 5) + 32) + (withUnit ? " °F" : "");
};

const formatSpeed = (speedInKmPerHour: number, to: Speed): string => {
  if (to === "km/h") return `${speedInKmPerHour.toFixed(1)} ${translate("weather-plugin.kmh")}`;
  if (to === "m/s") return `${Math.round(speedInKmPerHour * (5 / 18))} ${translate("weather-plugin.ms")}`;
  return `${(speedInKmPerHour * 0.6213).toFixed(1)} ${translate("weather-plugin.mph")}`;
};

const weatherCodeToIcon = (code: number) => {
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

const weatherCodeDescription = (code: number) => {
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

const CACHE_TIME = 1000 * 60 * 20;

const mockCity = {
  id: 3060972,
  name: "Bratislava",
  latitude: 48.14816,
  longitude: 17.10674,
  country: "Slovakia",
  admin1: "Bratislava",
};

const mockWeather = {
  weather: {
    temperature: 15,
    windSpeed: 3.5,
    windDirection: 200,
    weatherCode: 3,
    lastUpdated: Date.now(),
  },
};

const WidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<PluginWidgetConfigType>) => {
  const onConfirm = () => {
    if (!selectedCity) return;
    saveConfiguration({
      location: selectedCity,
      temperatureUnit,
      speedUnit,
    });
  };

  const onCitySearch = async (query: string) => {
    setLoadingCities(true);
    try {
      const res = await searchCity(query);
      setCities(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCities(false);
    }
  };

  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setCity] = useState<City | null>(currentConfig ? currentConfig.location : null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<Temperature>(
    currentConfig ? currentConfig.temperatureUnit : "c",
  );
  const [speedUnit, setSpeedUnit] = useState<Speed>(currentConfig ? currentConfig.speedUnit : "km/h");
  const { t } = useTranslation();

  return (
    <div className="WeatherWidget-config">
      <div>
        <label>{t("weather-plugin.selectCity")}:</label>
        <Combobox<City | null>
          options={cities}
          value={selectedCity}
          onChange={setCity}
          onInputChange={onCitySearch}
          isLoading={loadingCities}
          getOptionKey={(o) => (o ? o.id.toString() : "")}
          getOptionLabel={(o) => (o ? formatCityLabel(o) : "")}
          shouldDisplayOption={(o) => !!o}
          placeholder={t("weather-plugin.selectCity")}
        />
      </div>

      <div>
        <label>{t("weather-plugin.temperatureUnit")}:</label>
        <Select<Temperature>
          options={["c", "f"]}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => (o === "c" ? "°C" : "°F")}
          value={temperatureUnit}
          onChange={setTemperatureUnit}
        />
      </div>
      <div>
        <label>{t("weather-plugin.speedUnit")}</label>
        <Select<Speed>
          options={["km/h", "m/s", "mph"]}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => o}
          value={speedUnit}
          onChange={setSpeedUnit}
        />
      </div>

      <Button className="save-config" onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};

const useCurrentWeather = (config: PluginWidgetConfigType) => {
  const store = useWidgetStorage<{ weather: CurrentWeather & { lastUpdated: number } }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weather, setWeather] = useState<(CurrentWeather & { lastUpdated: number }) | null>(null);

  useAsyncEffect(async () => {
    await store.waitForLoad();
    const fromStorage = store.get("weather");
    if (fromStorage) {
      setWeather(fromStorage);
      if (fromStorage.lastUpdated + CACHE_TIME > Date.now()) return;
      setIsLoading(false);
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setIsRefreshing(false);
      setWeather(null);
    }
    try {
      const weather = await gerCurrentWeather(config.location);
      store.set("weather", { lastUpdated: Date.now(), ...weather });
      setWeather({
        ...weather,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [config.location, store]);

  return {
    isLoading,
    isRefreshing,
    weather,
  };
};

const useForecastWeather = (config: PluginWidgetConfigType) => {
  const store = useWidgetStorage<{ weather: { forecast: WeatherForecast[]; lastUpdated: number } }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forecast, setForecast] = useState<WeatherForecast[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const { i18n } = useTranslation();

  useAsyncEffect(async () => {
    await store.waitForLoad();
    const fromStorage = store.get("weather");
    if (fromStorage) {
      fromStorage.forecast.forEach((r) => {
        r.date = dayjs(r.dateRaw);
      });
      setForecast(fromStorage.forecast);
      setLastUpdated(fromStorage.lastUpdated);
      if (fromStorage.lastUpdated + CACHE_TIME > Date.now()) return;
      setIsLoading(false);
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setIsRefreshing(false);
      setForecast(null);
    }
    try {
      const weather = await getForecast(config.location);
      store.set("weather", {
        forecast: weather.map(({ date, ...rest }) => rest as WeatherForecast),
        lastUpdated: Date.now(),
      });
      setForecast(weather);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [config.location, store]);

  useOnChangeEffect(() => {
    if (forecast) {
      setForecast(
        forecast.map((f) => {
          return {
            ...f,
            date: f.date.clone().locale(i18n.language),
          };
        }),
      );
    }
  }, [i18n.language]);

  return {
    isLoading,
    isRefreshing,
    forecast,
    lastUpdated,
  };
};

const MainScreenCurrent = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
  const { weather } = instanceId === "mock" ? mockWeather : useCurrentWeather(config);
  const { rem } = useSizeSettings();
  const { t } = useTranslation();

  return (
    <Tooltip
      label={!weather ? t("loading") : t("lastUpdatedAt", { datetime: dayjs(weather.lastUpdated).format("HH:mm") })}
      placement="top"
    >
      <div className="WeatherWidget current">
        {!!weather && (
          <>
            <Tooltip
              label={`${weatherCodeDescription(weather.weatherCode)} (${t("weather-plugin.weatherCode", { code: weather.weatherCode })})`}
            >
              <Icon icon={weatherCodeToIcon(weather.weatherCode)} width={rem(6)} height={rem(6)} />
            </Tooltip>
            <div>
              <div className="temperature">
                <div>{formatTemperature(weather.temperature, config.temperatureUnit)}</div>
              </div>
              <div className="wind">
                <Icon
                  icon={builtinIcons.arrowBack}
                  height={rem(1.2)}
                  style={{ transform: `rotate(${Math.round((weather.windDirection + 90) % 360)}deg)` }}
                />
                <div>{formatSpeed(weather.windSpeed, config.speedUnit)}</div>
              </div>
              <div className="location">
                <Icon icon={builtinIcons.location} height={rem(1.2)} />
                <div>{config.location.name}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </Tooltip>
  );
};

const MainScreenForecast = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
  const mockForecast = useMemo(
    () => ({
      forecast: [
        {
          date: dayjs(),
          windSpeed: 2.3,
          windDirection: 190,
          weatherCode: 1,
          temperatureMin: 10,
          temperatureMax: 15,
        },
        {
          date: dayjs().add(1, "day"),
          windSpeed: 3.1,
          windDirection: 210,
          weatherCode: 1,
          temperatureMin: 5,
          temperatureMax: 9,
        },
        {
          date: dayjs().add(2, "day"),
          windSpeed: 3.6,
          windDirection: 280,
          weatherCode: 0,
          temperatureMin: 12,
          temperatureMax: 16,
        },
        {
          date: dayjs().add(3, "day"),
          windSpeed: 2.3,
          windDirection: 190,
          weatherCode: 0,
          temperatureMin: 11,
          temperatureMax: 16,
        },
        {
          date: dayjs().add(4, "day"),
          windSpeed: 4.5,
          windDirection: 90,
          weatherCode: 1,
          temperatureMin: 14,
          temperatureMax: 18,
        },
      ],
      lastUpdated: Date.now(),
    }),
    [],
  );

  const { forecast, lastUpdated } = instanceId === "mock" ? mockForecast : useForecastWeather(config);
  const { rem } = useSizeSettings();
  const { t } = useTranslation();

  return (
    <Tooltip
      label={!lastUpdated ? t("loading") : t("lastUpdatedAt", { datetime: dayjs(lastUpdated).format("HH:mm") })}
      placement="top"
    >
      <div className="WeatherWidget forecast">
        <div>
          <h2>{t("weather-plugin.forecast")}</h2>
          <div className="location">
            <Icon icon={builtinIcons.location} height={rem(1.2)} />
            <div>{config.location.name}</div>
          </div>
        </div>
        {!!forecast && (
          <FloatingDelayGroup delay={500}>
            {forecast.map((f) => {
              return (
                <div key={f.date.toISOString()} className="day-row">
                  <Tooltip
                    label={`${weatherCodeDescription(f.weatherCode)} (${t("weather-plugin.weatherCode", { code: f.weatherCode })})`}
                  >
                    <Icon icon={weatherCodeToIcon(f.weatherCode)} width={rem(6)} height={rem(6)} />
                  </Tooltip>
                  <div>
                    <div className="temperature">
                      <div>
                        {formatTemperature(f.temperatureMin, config.temperatureUnit, false)} &ndash;{" "}
                        {formatTemperature(f.temperatureMax, config.temperatureUnit)}
                      </div>
                    </div>
                    <div className="wind">
                      <Icon
                        icon={builtinIcons.arrowBack}
                        height={rem(1.2)}
                        style={{ transform: `rotate(${Math.round((f.windDirection + 90) % 360)}deg)` }}
                      />
                      <div>{formatSpeed(f.windSpeed, config.speedUnit)}</div>
                    </div>
                    <div className="location">
                      <Icon icon={builtinIcons.time} height={rem(1.2)} />
                      <div>{capitalize(f.date.format("dddd"))}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </FloatingDelayGroup>
        )}
      </div>
    </Tooltip>
  );
};

export const weatherWidgetDescriptorCurrent = {
  id: "weather-current",
  get name() {
    return translate("weather-plugin.currentWeather");
  },
  configurationScreen: WidgetConfigScreen,
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
} as const satisfies WidgetDescriptor<PluginWidgetConfigType>;

export const weatherWidgetDescriptorForecast = {
  id: "weather-forecast",
  get name() {
    return translate("weather-plugin.weatherForecast");
  },
  configurationScreen: WidgetConfigScreen,
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
} as const satisfies WidgetDescriptor<PluginWidgetConfigType>;

export const weatherPlugin = {
  id: "weather-plugin",
  get name() {
    return translate("weather-plugin.name");
  },
  widgets: [weatherWidgetDescriptorCurrent, weatherWidgetDescriptorForecast],
  configurationScreen: null,
} satisfies AnoriPlugin;
