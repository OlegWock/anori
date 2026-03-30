import "../styles.scss";
import { Tooltip } from "@anori/components/Tooltip";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import { useAsyncEffect, useMirrorStateToRef } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { WeatherCurrentWidgetStore } from "@anori/utils/storage";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { gerCurrentWeather } from "../api";
import { useCurrentWeatherStore } from "../storage";
import type { WeatherWidgetConfig } from "../types";
import {
  CACHE_TIME,
  CHECK_INTERVAL,
  formatSpeed,
  formatTemperature,
  weatherCodeDescription,
  weatherCodeToIcon,
} from "../utils";

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

const useCurrentWeather = (config: WeatherWidgetConfig) => {
  const store = useCurrentWeatherStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weather, setWeather] = useState<WeatherCurrentWidgetStore["weather"] | null>(null);
  const weatherRef = useMirrorStateToRef(weather);

  const refresh = useCallback(async () => {
    if (weatherRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const fetched = await gerCurrentWeather(config.location);
      const newWeather = { ...fetched, lastUpdated: Date.now() };
      store.set("weather", newWeather);
      setWeather(newWeather);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [config.location, store]);

  useAsyncEffect(async () => {
    await store.waitForLoad();
    const fromStorage = store.get("weather");
    if (fromStorage) {
      setWeather(fromStorage);
      if (fromStorage.lastUpdated + CACHE_TIME > Date.now()) return;
    }
    refresh();
  }, [config.location, store]);

  useEffect(() => {
    const tid = setInterval(() => {
      const lastUpdated = weatherRef.current?.lastUpdated;
      if (!lastUpdated || lastUpdated + CACHE_TIME < Date.now()) {
        refresh();
      }
    }, CHECK_INTERVAL);
    return () => clearInterval(tid);
  }, [refresh]);

  return {
    isLoading,
    isRefreshing,
    weather,
  };
};

export const MainScreenCurrent = ({ config, instanceId }: WidgetRenderProps<WeatherWidgetConfig>) => {
  const { weather } = instanceId === "mock" ? mockWeather : useCurrentWeather(config);
  const { rem } = useSizeSettings();
  const { t } = useTranslation();

  return (
    <Tooltip
      label={!weather ? t("loading") : t("lastUpdatedAt", { datetime: moment(weather.lastUpdated).format("HH:mm") })}
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

export { mockCity };
