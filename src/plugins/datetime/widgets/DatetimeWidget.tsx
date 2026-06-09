import { useForceRerender, useLazyRef } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { capitalize } from "@anori/utils/strings";
import { m } from "framer-motion";
import moment from "moment-timezone";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import type { DatetimeWidgetConfig } from "../types";

const widget = cva({
  base: { display: "flex", flexDirection: "column", flexGrow: 1 },
  variants: {
    size: {
      s: {},
      m: { justifyContent: "center", alignItems: "center", position: "relative" },
    },
  },
});
const spacer = css({ flexGrow: 1 });
const analogClock = css({
  position: "relative",
  opacity: 0.5,
  height: "4rem",
  width: "4rem",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "text.primary",
  borderRadius: "full",
});
const hand = cva({
  base: {
    width: "50%",
    right: "50%",
    height: "3px",
    background: "text.primary",
    position: "absolute",
    top: "50%",
    borderRadius: "sm",
    transformOrigin: "98%",
  },
  variants: { type: { hour: { width: "30%" }, min: { width: "45%" } } },
});
// `--widget-box-percent` is set per widget box (0..1); the time scales with it. Wide overrides to a
// fixed size; sizes shrink a touch in compact mode.
const timeText = cva({
  base: { lineHeight: "1.2" },
  variants: {
    size: { s: { fontSize: "2xl" }, m: { fontSize: "display" } },
    wide: { true: {} },
    smaller: { true: {} },
  },
  compoundVariants: [
    {
      size: "s",
      smaller: true,
      css: {
        fontSize: "calc(1rem + var(--widget-box-percent) * 0.45rem)",
        _compact: { fontSize: "calc(1rem + var(--widget-box-percent) * 0.35rem)" },
      },
    },
    { size: "s", wide: true, css: { fontSize: "2.5rem" } },
    {
      size: "m",
      smaller: true,
      css: {
        fontSize: "calc(3rem + var(--widget-box-percent) * 0.75rem)",
        _compact: { fontSize: "calc(2.5rem + var(--widget-box-percent) * 0.75rem)" },
      },
    },
  ],
});
const secondaryText = cva({
  base: {},
  variants: { size: { s: { fontSize: "sm" }, m: { fontSize: "xl" } } },
});

export const WidgetScreen = ({ config, size }: WidgetRenderProps<DatetimeWidgetConfig> & { size: "s" | "m" }) => {
  const { i18n } = useTranslation();
  const {
    size: { width },
  } = useWidgetMetadata();
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

  const wide = size === "s" && width >= 2;

  return (
    <div className={widget({ size })}>
      {size === "m" && (
        <div className={analogClock}>
          <m.div
            className={hand({ type: "hour" })}
            style={{
              rotate: `${(hours / 12) * 360 + (minutes / 60) * 30 + 90}deg`,
            }}
          />
          <m.div
            className={hand({ type: "min" })}
            style={{
              rotate: `${(minutes / 60) * 360 + (seconds / 60) * 6 + 90}deg`,
            }}
          />
        </div>
      )}
      {size === "m" && <div className={spacer} />}
      <div className={timeText({ size, wide, smaller: smallerTime })}>{time}</div>
      {!!date && <div className={secondaryText({ size })}>{date}</div>}
      <div className={spacer} />
      <div className={secondaryText({ size })}>{config.title}</div>
    </div>
  );
};
