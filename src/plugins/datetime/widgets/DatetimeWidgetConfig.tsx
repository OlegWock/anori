import "./DatetimeWidgetConfig.scss";
import { Button } from "@anori/components/Button";
import { Combobox } from "@anori/components/Combobox";
import { Input } from "@anori/components/Input";
import { Select } from "@anori/components/lazy-components";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { capitalize } from "@anori/utils/strings";
import moment from "moment-timezone";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DatetimeWidgetConfig } from "../types";

export const ConfigScreen = ({
  currentConfig,
  saveConfiguration,
  size,
}: WidgetConfigurationScreenProps<DatetimeWidgetConfig> & { size: "s" | "m" }) => {
  const { t } = useTranslation();

  const date = moment({
    hour: 9,
    minute: 33,
    second: 42,
    date: 14,
    month: 10,
    year: 1983,
  });

  const availableTimeFormatsMap: Record<string, string> = {
    "h:mm a": date.format("h:mm a"),
    "hh:mm a": date.format("hh:mm a"),
    "h:mm A": date.format("h:mm A"),
    "hh:mm A": date.format("hh:mm A"),
    "h:mm": date.format("h:mm"),
    "hh:mm": date.format("hh:mm"),
    "H:mm": `${date.format("H:mm")} (${t("datetime-plugin.24hours")})`,
    "HH:mm": `${date.format("HH:mm")} (${t("datetime-plugin.24hours")})`,
    "hh:mm:ss a": date.format("hh:mm:ss a"),
    "hh:mm:ss A": date.format("hh:mm:ss A"),
    "HH:mm:ss": `${date.format("HH:mm:ss")} (${t("datetime-plugin.24hours")})`,
  };

  const availableTimeFormats = Object.keys(availableTimeFormatsMap);

  const availableDateFormatsMap: Record<string, string> = {
    noDate: t("datetime-plugin.withoutDate"),
    "MMM Do, Y": capitalize(date.format("MMM Do, Y")),
    "MMMM Do, Y": capitalize(date.format("MMMM Do, Y")),
    "MMM D, Y": capitalize(date.format("MMM D, Y")),
    "MMMM D, Y": capitalize(date.format("MMMM D, Y")),
    "M/D/Y": date.format("M/D/Y"),
    "Do MMM Y": date.format("Do MMM Y"),
    "Do MMMM Y": date.format("Do MMMM Y"),
    "D MMM Y": date.format("D MMM Y"),
    "D MMMM Y": date.format("D MMMM Y"),
    "D/M/Y": date.format("D/M/Y"),
    "Y-MM-DD": date.format("Y-MM-DD"),
  };

  const availableDateFormats = Object.keys(availableDateFormatsMap);

  const defaultTimeFormat = size === "s" ? "HH:mm" : "HH:mm:ss";
  const defaultDateFormat = size === "s" ? "noDate" : "Do MMMM Y";

  const allTz = useMemo(() => moment.tz.names(), []);
  const [title, setTitle] = useState(currentConfig ? currentConfig.title : "");
  const [timeFormat, setTimeFormat] = useState(currentConfig ? currentConfig.timeFormat : defaultTimeFormat);
  const [dateFormat, setDateFormat] = useState(currentConfig ? currentConfig.dateFormat : defaultDateFormat);
  const [tz, setTz] = useState(currentConfig ? currentConfig.tz : moment.tz.guess());

  return (
    <div className="DateTimeWidget-config">
      <div>
        <label>{t("title")}</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label>{t("timezone")}</label>
        <Combobox<string>
          options={allTz}
          value={tz}
          onChange={setTz}
          placeholder={t("startTypingToSearch")}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => o.replace(/_/gim, " ")}
          shouldDisplayOption={(o, t) => o.toLowerCase().includes(t.toLowerCase())}
        />
      </div>
      <div>
        <label>{t("datetime-plugin.timeFormat")}</label>
        <Select<string>
          options={availableTimeFormats}
          value={timeFormat}
          onChange={setTimeFormat}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => availableTimeFormatsMap[o]}
        />
      </div>
      <div>
        <label>{t("datetime-plugin.dateFormat")}</label>
        <Select<string>
          options={availableDateFormats}
          value={dateFormat}
          onChange={setDateFormat}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => availableDateFormatsMap[o]}
        />
      </div>
      <Button className="save-config" onClick={() => saveConfiguration({ title, timeFormat, dateFormat, tz })}>
        {t("save")}
      </Button>
    </div>
  );
};
