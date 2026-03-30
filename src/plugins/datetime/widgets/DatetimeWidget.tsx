import "./DatetimeWidget.scss";
import { useForceRerender, useLazyRef } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { capitalize } from "@anori/utils/strings";
import clsx from "clsx";
import { m } from "framer-motion";
import moment from "moment-timezone";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DatetimeWidgetConfig } from "../types";

export const WidgetScreen = ({ config, size }: WidgetRenderProps<DatetimeWidgetConfig> & { size: "s" | "m" }) => {
  const { i18n } = useTranslation();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const currentMoment = useMemo(() => moment().tz(config.tz), [config.tz, i18n.language]);
  const lastTickTimeRef = useLazyRef(() => Date.now());
  const forceRerender = useForceRerender();

  // TODO: probably should refactor this so dependencies are explicit?
  // TODO: also would be good to migrate to dayjs
  // biome-ignore lint/correctness/useExhaustiveDependencies: both using i18n as proxy and mutable moment messes with deps array
  const time = useMemo(
    () => currentMoment.format(config.timeFormat),
    [currentMoment.valueOf(), i18n.language, config.timeFormat],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: same as above
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: same as above
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
