import { Select } from "@anori/components/lazy-components";
import { Button } from "@anori/design-system/components/Button/Button";
import { Combobox } from "@anori/design-system/components/Combobox/Combobox";
import { Field } from "@anori/design-system/components/Field/Field";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { City, Speed, Temperature } from "../api";
import { searchCity } from "../api";
import { attribution, config, saveConfig, unitField, unitsRow } from "../styles";
import type { WeatherWidgetConfig } from "../types";
import { formatCityLabel } from "../utils";

export const WeatherWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<WeatherWidgetConfig>) => {
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

  const [cities, setCities] = useState<City[]>(currentConfig?.location ? [currentConfig.location] : []);
  const [selectedCity, setCity] = useState<City | null>(currentConfig ? currentConfig.location : null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<Temperature>(
    currentConfig ? currentConfig.temperatureUnit : "c",
  );
  const [speedUnit, setSpeedUnit] = useState<Speed>(currentConfig ? currentConfig.speedUnit : "km/h");
  const { t } = useTranslation();

  return (
    <div className={config}>
      <Field label={`${t("weather-plugin.selectCity")}:`}>
        <Combobox<City | null>
          options={cities}
          value={selectedCity}
          onChange={(city) => {
            setCity(city);
            setCities(city ? [city] : []);
          }}
          onInputChange={onCitySearch}
          isLoading={loadingCities}
          getOptionKey={(o) => (o ? o.id.toString() : "")}
          getOptionLabel={(o) => (o ? formatCityLabel(o) : "")}
          shouldDisplayOption={(o) => !!o}
          placeholder={t("weather-plugin.selectCity")}
        />
      </Field>

      <div className={unitsRow}>
        <Field className={unitField} label={`${t("weather-plugin.temperatureUnit")}:`}>
          <Select<Temperature>
            options={["c", "f"]}
            getOptionKey={(o) => o}
            getOptionLabel={(o) => (o === "c" ? "°C" : "°F")}
            value={temperatureUnit}
            onChange={setTemperatureUnit}
          />
        </Field>
        <Field className={unitField} label={t("weather-plugin.speedUnit")}>
          <Select<Speed>
            options={["km/h", "m/s", "mph"]}
            getOptionKey={(o) => o}
            getOptionLabel={(o) => o}
            value={speedUnit}
            onChange={setSpeedUnit}
          />
        </Field>
      </div>

      <Button className={saveConfig} onClick={onConfirm}>
        {t("save")}
      </Button>

      <div className={attribution}>
        <Trans t={t} i18nKey="weather-plugin.attribution">
          {/* biome-ignore lint/a11y/useAnchorContent: content injected by i18n */}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" />
        </Trans>
      </div>
    </div>
  );
};
