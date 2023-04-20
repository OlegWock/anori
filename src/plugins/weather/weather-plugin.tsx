import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps } from "@utils/user-data/types";
import { useEffect, useState } from "react";
import './styles.scss';
import { Combobox } from "@components/Combobox";
import { City, CurrentWeather, Speed, Temperature, WeatherForecast, gerCurrentWeather, getForecast, searchCity } from "./api";
import { Select } from "@components/Select";
import { useWidgetStorage } from "@utils/plugin";
import moment from "moment";
import { Icon } from "@components/Icon";
import { Tooltip } from "@components/Tooltip";
import { FloatingDelayGroup } from "@floating-ui/react-dom-interactions";
import { useSizeSettings } from "@utils/compact";

type PluginWidgetConfigType = {
    location: City,
    temperatureUnit: Temperature,
    speedUnit: Speed,
};

const formatCityLabel = (c: City) => {
    const admin = [c.admin4, c.admin3, c.admin2, c.admin1, c.country].filter(a => !!a).join(', ')
    return `${c.name} (${admin})`;
};

const formatTemperature = (valueInCelsius: number, to: Temperature, withUnit = true): string => {
    if (to === 'c') return Math.round(valueInCelsius) + (withUnit ? ' °C' : '');
    return Math.round((valueInCelsius * (9 / 5)) + 32) + (withUnit ? ' °F' : '');
};

const formatSpeed = (speedInKmPerHour: number, to: Speed): string => {
    if (to === 'km/h') return `${speedInKmPerHour.toFixed(1)} km/h`;
    if (to === 'm/s') return `${Math.round(speedInKmPerHour * (5 / 18))} m/s`;
    return `${(speedInKmPerHour * 0.6213).toFixed(1)} mph`;
};

const weatherCodeToIcon = (code: number) => {
    if (code === 0) return 'wi:day-sunny';
    if ([1, 2, 3].includes(code)) return 'wi:day-sunny-overcast';
    if ([45, 48].includes(code)) return 'wi:fog';
    if ([51, 53, 55].includes(code)) return 'wi:showers';
    if ([56, 57].includes(code)) return 'wi:rain-mix';
    if ([61, 63, 65].includes(code)) return 'wi:rain';
    if ([66, 67].includes(code)) return 'wi:rain-mix';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'wi:snow';
    if ([80, 81, 82].includes(code)) return 'wi:rain';
    if ([95, 96, 99].includes(code)) return 'wi:thunderstorm';

    return 'wi:cloud';
};

const weatherCodeDescription = (code: number) => {
    if (code === 0) return 'Clear sky';
    if ([1, 2, 3].includes(code)) return 'Partly cloudy';
    if ([45, 48].includes(code)) return 'Fog';
    if ([51, 53, 55].includes(code)) return 'Drizzle';
    if ([56, 57].includes(code)) return 'Freezing drizzle';
    if ([61, 63, 65].includes(code)) return 'Rain';
    if ([66, 67].includes(code)) return 'Freezing rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([80, 81, 82].includes(code)) return 'Rain shower';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';

    return 'Unknown weather code'
};

const CACHE_TIME = 1000 * 60 * 10;

const mockCity = {
    "id": 3060972,
    "name": "Bratislava",
    "latitude": 48.14816,
    "longitude": 17.10674,
    "country": "Slovakia",
    "admin1": "Bratislava"
}

const mockWeather = {
    weather: {
        temperature: 15,
        windSpeed: 3.5,
        windDirection: 200,
        weatherCode: 3,
        lastUpdated: Date.now(),
    }
};

const mockForecast = {
    forecast: [
        {
            date: moment(),
            windSpeed: 2.3,
            windDirection: 190,
            weatherCode: 1,
            temperatureMin: 10,
            temperatureMax: 15,
        }, {
            date: moment().add(1, 'day'),
            windSpeed: 3.1,
            windDirection: 210,
            weatherCode: 1,
            temperatureMin: 5,
            temperatureMax: 9,
        }, {
            date: moment().add(2, 'day'),
            windSpeed: 3.6,
            windDirection: 280,
            weatherCode: 0,
            temperatureMin: 12,
            temperatureMax: 16,
        }, {
            date: moment().add(3, 'day'),
            windSpeed: 2.3,
            windDirection: 190,
            weatherCode: 0,
            temperatureMin: 11,
            temperatureMax: 16,
        }, {
            date: moment().add(4, 'day'),
            windSpeed: 4.5,
            windDirection: 90,
            weatherCode: 1,
            temperatureMin: 14,
            temperatureMax: 18,
        },
    ],
    lastUpdated: Date.now(),
};

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<PluginWidgetConfigType>) => {
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
    const [temperatureUnit, setTemperatureUnit] = useState<Temperature>(currentConfig ? currentConfig.temperatureUnit : 'c');
    const [speedUnit, setSpeedUnit] = useState<Speed>(currentConfig ? currentConfig.speedUnit : 'km/h');

    return (<div className="WeatherWidget-config">
        <div>
            <label>Select city</label>
            <Combobox<City | null>
                options={cities}
                value={selectedCity}
                onChange={setCity}
                onInputChange={onCitySearch}
                isLoading={loadingCities}
                getOptionKey={o => o ? o.id.toString() : ''}
                getOptionLabel={o => o ? formatCityLabel(o) : ''}
                shouldDisplayOption={(o, q) => !!o}
                placeholder="Select city"
            />
        </div>

        <div>
            <label>Temperature unit</label>
            <Select<Temperature>
                options={['c', 'f']}
                getOptionKey={o => o}
                getOptionLabel={o => o === 'c' ? 'Celsius' : 'Fahrenheit'}
                value={temperatureUnit}
                onChange={setTemperatureUnit}
            />
        </div>
        <div>
            <label>Wind speed unit</label>
            <Select<Speed>
                options={['km/h', 'm/s', 'mph']}
                getOptionKey={o => o}
                getOptionLabel={o => o}
                value={speedUnit}
                onChange={setSpeedUnit}
            />
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const useCurrentWeather = (config: PluginWidgetConfigType) => {
    const store = useWidgetStorage<{ weather: CurrentWeather & { lastUpdated: number } }>();
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [weather, setWeather] = useState<(CurrentWeather & { lastUpdated: number }) | null>(null);

    useEffect(() => {
        const load = async () => {
            const fromStorage = store.get('weather');
            if (fromStorage) {
                setWeather(fromStorage);
                if (fromStorage.lastUpdated + CACHE_TIME > Date.now()) return;
                setIsLoading(false)
                setIsRefreshing(true);
            } else {
                setIsLoading(true)
                setIsRefreshing(false);
                setWeather(null);
            }
            try {
                const weather = await gerCurrentWeather(config.location);
                setWeather({
                    ...weather,
                    lastUpdated: Date.now(),
                });
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false)
                setIsRefreshing(false);
            }
        };

        load();
    }, []);

    return {
        isLoading,
        isRefreshing,
        weather,
    }
};


const useForecastWeather = (config: PluginWidgetConfigType) => {
    const store = useWidgetStorage<{ weather: { forecast: WeatherForecast[], lastUpdated: number } }>();
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [forecast, setForecast] = useState<WeatherForecast[] | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(0);

    useEffect(() => {
        const load = async () => {
            const fromStorage = store.get('weather');
            if (fromStorage) {
                setForecast(fromStorage.forecast);
                setLastUpdated(fromStorage.lastUpdated);
                if (fromStorage.lastUpdated + CACHE_TIME > Date.now()) return;
                setIsLoading(false)
                setIsRefreshing(true);
            } else {
                setIsLoading(true)
                setIsRefreshing(false);
                setForecast(null);
            }
            try {
                const weather = await getForecast(config.location);
                setForecast(weather);
                setLastUpdated(Date.now());
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false)
                setIsRefreshing(false);
            }
        };

        load();
    }, []);

    return {
        isLoading,
        isRefreshing,
        forecast,
        lastUpdated,
    }
};

const MainScreenCurrent = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
    const { weather } = instanceId === 'mock' ? mockWeather : useCurrentWeather(config);
    const { rem } = useSizeSettings();

    return (<Tooltip label={!weather ? 'Loading...' : `Last updated at ${moment(weather.lastUpdated).format('HH:mm')}`} placement="top">
        <div className="WeatherWidget current">
            {!!weather && <>

                <Tooltip label={`${weatherCodeDescription(weather.weatherCode)} (weather code ${weather.weatherCode})`}>
                    <Icon icon={weatherCodeToIcon(weather.weatherCode)} width={rem(6)} height={rem(6)} />
                </Tooltip>
                <div>
                    <div className="temperature">
                        {/* <Icon icon="wi:thermometer" height={rem(2.5)} /> */}
                        <div>{formatTemperature(weather.temperature, config.temperatureUnit)}</div>
                    </div>
                    <div className="wind">
                        <Icon icon="ion:arrow-back" height={rem(1.2)} style={{ transform: `rotate(${Math.round((weather.windDirection + 90) % 360)}deg)` }} />
                        <div>{formatSpeed(weather.windSpeed, config.speedUnit)}</div>
                    </div>
                    <div className="location">
                        <Icon icon="ion:location-sharp" height={rem(1.2)} />
                        <div>{config.location.name}</div>
                    </div>
                </div>
            </>}
        </div>
    </Tooltip>);
};


const MainScreenForecast = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
    const { forecast, lastUpdated } = instanceId === 'mock' ? mockForecast : useForecastWeather(config);
    const { rem } = useSizeSettings();

    return (<Tooltip label={!lastUpdated ? 'Loading...' : `Last updated at ${moment(lastUpdated).format('HH:mm')}`} placement="top">
        <div className="WeatherWidget forecast">
            <div>
                <h2>Forecast</h2>
                <div className="location">
                    <Icon icon="ion:location-sharp" height={rem(1.2)} />
                    <div>{config.location.name}</div>
                </div>
            </div>
            {!!forecast && <FloatingDelayGroup delay={500}>
                {forecast.map(f => {
                    return (<div key={f.date.toISOString()} className="day-row">
                        <Tooltip label={`${weatherCodeDescription(f.weatherCode)} (weather code ${f.weatherCode})`}>
                            <Icon icon={weatherCodeToIcon(f.weatherCode)} width={rem(6)} height={rem(6)} />
                        </Tooltip>
                        <div>
                            <div className="temperature">
                                <div>{formatTemperature(f.temperatureMin, config.temperatureUnit, false)} &ndash; {formatTemperature(f.temperatureMax, config.temperatureUnit)}</div>
                            </div>
                            <div className="wind">
                                <Icon icon="ion:arrow-back" height={rem(1.2)} style={{ transform: `rotate(${Math.round((f.windDirection + 90) % 360)}deg)` }} />
                                <div>{formatSpeed(f.windSpeed, config.speedUnit)}</div>
                            </div>
                            <div className="location">
                                <Icon icon="ion:time-outline" height={rem(1.2)} />
                                <div>{f.date.format('dddd')}</div>
                            </div>
                        </div>
                    </div>);
                })}
            </FloatingDelayGroup>}
        </div>
    </Tooltip>);
};


const widgetDescriptorCurrent = {
    id: 'weather-current',
    name: 'Current weather',
    configurationScreen: WidgetConfigScreen,
    withAnimation: false,
    mainScreen: MainScreenCurrent,
    mock: () => {
        return (<MainScreenCurrent instanceId="mock" config={{ location: mockCity, temperatureUnit: 'c', speedUnit: 'km/h' }} />)
    },
    size: {
        width: 2,
        height: 1,
    }
} as const;

const widgetDescriptorForecast = {
    id: 'weather-forecast',
    name: 'Weather forecast',
    configurationScreen: WidgetConfigScreen,
    withAnimation: false,
    mainScreen: MainScreenForecast,
    mock: () => {
        return (<MainScreenForecast instanceId="mock" config={{ location: mockCity, temperatureUnit: 'c', speedUnit: 'km/h' }} />)
    },
    size: {
        width: 2,
        height: 4,
    }
} as const;

export const weatherPlugin = {
    id: 'weather-plugin',
    name: 'Weather',
    widgets: [
        widgetDescriptorCurrent,
        widgetDescriptorForecast,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;