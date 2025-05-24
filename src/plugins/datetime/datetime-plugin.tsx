import moment from "moment-timezone";
import {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetDescriptor,
  WidgetRenderProps,
} from "@utils/user-data/types";
import "./styles.scss";
import { Button } from "@components/Button";
import { useState } from "react";
import { Input } from "@components/Input";
import { useMemo } from "react";
import { Select } from "@components/Select";
import clsx from "clsx";
import { useEffect } from "react";
import { Combobox } from "@components/Combobox";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { m } from "framer-motion";
import { capitalize } from "@utils/strings";
import { useForceRerender, useLazyRef } from "@utils/hooks";

type WidgetConfig = {
  tz: string;
  title: string;
  timeFormat: string;
  dateFormat: string;
};

const ConfigScreen = ({
  currentConfig,
  saveConfiguration,
  size,
}: WidgetConfigurationScreenProps<WidgetConfig> & { size: "s" | "m" }) => {
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

const WidgetScreen = ({ config, size }: WidgetRenderProps<WidgetConfig> & { size: "s" | "m" }) => {
  const { i18n } = useTranslation();
  const currentMoment = useMemo(() => moment().tz(config.tz), [config.tz, i18n.language]);
  const lastTickTimeRef = useLazyRef(() => Date.now());
  const forceRerender = useForceRerender();

  const time = useMemo(
    () => currentMoment.format(config.timeFormat),
    [currentMoment.valueOf(), i18n.language, config.timeFormat],
  );
  const date = useMemo(() => {
    if (config.dateFormat === "noDate") return "";
    let date = currentMoment.format(config.dateFormat);
    if (config.dateFormat.startsWith("MMM")) {
      date = capitalize(date);
    }
    return date;
  }, [currentMoment.valueOf(), i18n.language, config.dateFormat]);

  const smallerTime =
    config.timeFormat.includes("A") || config.timeFormat.includes("a") || config.timeFormat.includes("ss");
  const seconds = currentMoment.seconds();
  const minutes = currentMoment.minutes();
  const hours = currentMoment.hours();

  useEffect(() => {
    const intervalMs = config.timeFormat.includes("ss") ? 1000 : 20 * 1000;
    const tid = window.setInterval(() => {
      // Use diff since setInterval might be very unreliable
      const msDiff = Date.now() - lastTickTimeRef.current;
      lastTickTimeRef.current = Date.now();
      // Avoid creating new moment every time
      currentMoment.add(msDiff, "milliseconds");
      forceRerender();
    }, intervalMs);

    return () => window.clearInterval(tid);
  }, [config.tz, config.timeFormat, config.dateFormat]);

  return (
    <div className={clsx("DateTimeWidget", `DateTimeWidget-size-${size}`)}>
      {size === "m" && (
        <div className="analog-clock">
          <m.div
            className="hand hour-hand"
            style={{
              rotate: `${((hours / 12) * 360) + ((minutes / 60) * 30) + 90}deg`,
            }}
          />
          <m.div
            className="hand min-hand"
            style={{
              rotate: `${((minutes / 60) * 360) + ((seconds / 60) * 6) + 90}deg`,
            }}
          />
        </div>
      )}
      {size === "m" && <div className="spacer" />}
      <div className={clsx("time", { "smaller-time": smallerTime })}>{time}</div>
      {!!date && <div className="date">{date}</div>}
      <div className="spacer" />
      <div className="title">{config.title}</div>
    </div>
  );
};

export const datetimeWidgetDescriptorS = {
  id: "datetime-widget",
  get name() {
    return translate("datetime-plugin.widgetNameS");
  },
  appearance: {
    resizable: false,
    size: {
      width: 1,
      height: 1,
    },
  },
  configurationScreen: (props: WidgetConfigurationScreenProps<WidgetConfig>) => <ConfigScreen size="s" {...props} />,
  mainScreen: (props: WidgetRenderProps<WidgetConfig>) => <WidgetScreen size="s" {...props} />,
  mock: () => (
    <WidgetScreen
      config={{
        title: "Bratislava",
        tz: "Europe/Bratislava",
        timeFormat: "HH:mm",
        dateFormat: "Do MMM Y",
      }}
      instanceId="mock"
      size="s"
    />
  ),
} satisfies WidgetDescriptor<WidgetConfig>;

export const datetimeWidgetDescriptorM = {
  id: "datetime-widget-m",
  get name() {
    return translate("datetime-plugin.widgetNameM");
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
  configurationScreen: (props: WidgetConfigurationScreenProps<WidgetConfig>) => <ConfigScreen size="m" {...props} />,
  mainScreen: (props: WidgetRenderProps<WidgetConfig>) => <WidgetScreen size="m" {...props} />,
  mock: () => (
    <WidgetScreen
      config={{
        title: "Bratislava",
        tz: "Europe/Bratislava",
        timeFormat: "HH:mm:ss",
        dateFormat: "Do MMMM Y",
      }}
      instanceId="mock"
      size="m"
    />
  ),
} satisfies WidgetDescriptor<WidgetConfig>;

export const datetimePlugin = {
  id: "datetime-plugin",
  get name() {
    return translate("datetime-plugin.name");
  },
  widgets: [datetimeWidgetDescriptorS, datetimeWidgetDescriptorM],
  configurationScreen: null,
} satisfies AnoriPlugin;
