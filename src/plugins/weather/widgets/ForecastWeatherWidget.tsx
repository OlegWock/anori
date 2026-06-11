import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Tooltip, TooltipProvider } from "@anori/design-system/components/Tooltip/Tooltip";
import { useSizeSettings } from "@anori/utils/compact";
import { useAsyncEffect, useMirrorStateToRef, useOnChangeEffect } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { capitalize } from "@anori/utils/strings";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getForecast, type WeatherForecast } from "../api";
import { useForecastWeatherStore } from "../storage";
import { dayRow, location, temperature, weatherWidget, wind } from "../styles";
import type { WeatherWidgetConfig } from "../types";
import {
  CACHE_TIME,
  CHECK_INTERVAL,
  formatSpeed,
  formatTemperature,
  weatherCodeDescription,
  weatherCodeToIcon,
} from "../utils";

const useForecastWeather = (config: WeatherWidgetConfig) => {
  const store = useForecastWeatherStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forecast, setForecast] = useState<WeatherForecast[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const lastUpdatedRef = useMirrorStateToRef(lastUpdated);
  const { i18n } = useTranslation();

  const refresh = useCallback(async () => {
    if (lastUpdatedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const weather = await getForecast(config.location);
      store.set("weather", {
        forecast: weather.map(({ date, ...rest }) => rest),
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

  useAsyncEffect(async () => {
    await store.waitForLoad();
    const fromStorage = store.get("weather");
    if (fromStorage) {
      const forecastWithDates = fromStorage.forecast.map((r) => ({
        ...r,
        date: moment(r.dateRaw),
      }));
      setForecast(forecastWithDates);
      setLastUpdated(fromStorage.lastUpdated);
      if (fromStorage.lastUpdated + CACHE_TIME > Date.now()) return;
    }
    refresh();
  }, [config.location, store]);

  useEffect(() => {
    const tid = setInterval(() => {
      if (!lastUpdatedRef.current || lastUpdatedRef.current + CACHE_TIME < Date.now()) {
        refresh();
      }
    }, CHECK_INTERVAL);
    return () => clearInterval(tid);
  }, [refresh]);

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

export const ForecastWeatherWidget = ({ config, instanceId }: WidgetRenderProps<WeatherWidgetConfig>) => {
  const mockForecast = useMemo(
    () => ({
      forecast: [
        {
          date: moment(),
          windSpeed: 2.3,
          windDirection: 190,
          weatherCode: 1,
          temperatureMin: 10,
          temperatureMax: 15,
        },
        {
          date: moment().add(1, "day"),
          windSpeed: 3.1,
          windDirection: 210,
          weatherCode: 1,
          temperatureMin: 5,
          temperatureMax: 9,
        },
        {
          date: moment().add(2, "day"),
          windSpeed: 3.6,
          windDirection: 280,
          weatherCode: 0,
          temperatureMin: 12,
          temperatureMax: 16,
        },
        {
          date: moment().add(3, "day"),
          windSpeed: 2.3,
          windDirection: 190,
          weatherCode: 0,
          temperatureMin: 11,
          temperatureMax: 16,
        },
        {
          date: moment().add(4, "day"),
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

  // biome-ignore lint/correctness/useHookAtTopLevel: instanceId is stable for a mounted widget, so the branch never changes across renders
  const { forecast, lastUpdated } = instanceId === "mock" ? mockForecast : useForecastWeather(config);
  const { rem } = useSizeSettings();
  const { t } = useTranslation();

  return (
    <Tooltip
      label={!lastUpdated ? t("loading") : t("lastUpdatedAt", { datetime: moment(lastUpdated).format("HH:mm") })}
      placement="top"
    >
      <div className={weatherWidget({ type: "forecast" })}>
        <div>
          <h2>{t("weather-plugin.forecast")}</h2>
          <div className={location({ small: true })}>
            <Icon icon={builtinIcons.location} height={rem(1.2)} />
            <div>{config.location.name}</div>
          </div>
        </div>
        {!!forecast && (
          <TooltipProvider delay={500} closeDelay={500}>
            {forecast.map((f) => {
              return (
                <div key={f.date.toISOString()} className={dayRow}>
                  <Tooltip
                    label={`${weatherCodeDescription(f.weatherCode)} (${t("weather-plugin.weatherCode", { code: f.weatherCode })})`}
                  >
                    <Icon icon={weatherCodeToIcon(f.weatherCode)} width={rem(6)} height={rem(6)} />
                  </Tooltip>
                  <div>
                    <div className={temperature({ small: true })}>
                      <div>
                        {formatTemperature(f.temperatureMin, config.temperatureUnit, false)} &ndash;{" "}
                        {formatTemperature(f.temperatureMax, config.temperatureUnit)}
                      </div>
                    </div>
                    <div className={wind}>
                      <Icon
                        icon={builtinIcons.arrowBack}
                        height={rem(1.2)}
                        style={{ transform: `rotate(${Math.round((f.windDirection + 90) % 360)}deg)` }}
                      />
                      <div>{formatSpeed(f.windSpeed, config.speedUnit)}</div>
                    </div>
                    <div className={location({ small: true })}>
                      <Icon icon={builtinIcons.time} height={rem(1.2)} />
                      <div>{capitalize(f.date.format("dddd"))}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        )}
      </div>
    </Tooltip>
  );
};
