import { z } from "zod";

// Mirrors `City` from ./api (the open-meteo geocoding result), validated for the persisted config.
const citySchema = z.object({
  id: z.number(),
  country: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
  admin3: z.string().optional(),
  admin4: z.string().optional(),
});

export const weatherWidgetConfigSchema = z.object({
  location: citySchema,
  temperatureUnit: z.enum(["c", "f"]),
  speedUnit: z.enum(["km/h", "m/s", "mph"]),
});
export type WeatherWidgetConfig = z.infer<typeof weatherWidgetConfigSchema>;
