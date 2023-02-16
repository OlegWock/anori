export type City = {
    name: string,
    latitude: number,
    longitude: number,
};

export const searchCity = async (query: string): Promise<City[]> => {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}`);
    const json = await response.json();

    return json.results.map((r: any) => {
        return {
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
        }
    })
};

export const gerCurrentWeather = async (city: City) => {
    // https://open-meteo.com/en/docs
    const response = await fetch(`https://api.open-meteo.com/v1/forecast`
        + `?latitude=${city.latitude}`
        + `&longitude=${city.longitude}`
        + `&hourly=temperature_2m,apparent_temperature,precipitation,rain,showers,snowfall,weathercode,windspeed_10m`
        + `&timezone=auto`)
};