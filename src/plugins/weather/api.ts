import moment, { Moment } from "moment-timezone";

export type City = {
    id: number,
    country: string,
    name: string,
    latitude: number,
    longitude: number,

    admin1?: string, 
    admin2?: string, 
    admin3?: string, 
    admin4?: string
};


export type CurrentWeather = {
    temperature: number,
    windSpeed: number,
    windDirection: number,
    weatherCode: number,
};

export type WeatherForecast = {
    date: Moment,
    dateRaw: string,
    windSpeed: number,
    windDirection: number,
    weatherCode: number,
    temperatureMin: number,
    temperatureMax: number,
};

export type Temperature = 'c' | 'f';

export type Speed = 'km/h' | 'm/s' | 'mph';

export const searchCity = async (query: string): Promise<City[]> => {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}`);
    const json = await response.json();

    return json.results.map((r: any) => {
        return {
            id: r.id,
            name: r.name,
            country: r.country,
            latitude: r.latitude,
            longitude: r.longitude,
            admin1: r.admin1,
            admin2: r.admin2,
            admin3: r.admin3,
            admin4: r.admin4,
        }
    })
};

export const gerCurrentWeather = async (city: City): Promise<CurrentWeather> => {
    // https://open-meteo.com/en/docs
    const response = await fetch(`https://api.open-meteo.com/v1/forecast`
        + `?latitude=${encodeURIComponent(city.latitude)}`
        + `&longitude=${encodeURIComponent(city.longitude)}`
        + `&current_weather=true`);
    const json = await response.json();
    return {
        temperature: json.current_weather.temperature,
        windSpeed: json.current_weather.windspeed,
        windDirection: json.current_weather.winddirection,
        weatherCode: json.current_weather.weathercode,
    };
};

export const getForecast = async (city: City): Promise<WeatherForecast[]> => {
    const tz = moment.tz.guess();
    const response = await fetch(`https://api.open-meteo.com/v1/forecast`
        + `?latitude=${encodeURIComponent(city.latitude)}`
        + `&longitude=${encodeURIComponent(city.longitude)}`
        + `&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,winddirection_10m_dominant`
        + `&timezone=${encodeURIComponent(tz)}`);
    const json = await response.json();

    const results = (json.daily.time as any[]).slice(0, 5).map((dateRaw, i) => {
        const date = moment(dateRaw);

        return {
            date,
            dateRaw,
            temperatureMin: json.daily.temperature_2m_min[i],
            temperatureMax: json.daily.temperature_2m_max[i],
            windSpeed: json.daily.windspeed_10m_max[i],
            windDirection: json.daily.winddirection_10m_dominant[i],
            weatherCode: json.daily.weathercode[i],
        };
    });

    return results;
};