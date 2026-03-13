import "../styles.scss";
import { Button } from "@anori/components/Button";
import { Combobox } from "@anori/components/Combobox";
import { Select } from "@anori/components/lazy-components";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { City, Speed, Temperature } from "../api";
import { searchCity } from "../api";
import type { WeatherWidgetConfig } from "../types";
import { formatCityLabel } from "../utils";

export const WeatherWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<WeatherWidgetConfig>) => {
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
