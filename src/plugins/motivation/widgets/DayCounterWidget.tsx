import { Heading } from "@anori/design-system/components/Heading/Heading";
import { formatDecimal } from "@anori/utils/format";
import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { daysUntil, parseLocalDateKey } from "../periods";
import type { DayCounterConfig } from "../types";

const root = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
  gap: "2",
});
const title = css({
  maxWidth: "100%",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
const number = css({
  fontWeight: "light",
  lineHeight: "none",
  fontVariantNumeric: "tabular-nums",
  fontSize: "calc(2rem + var(--widget-box-percent, 0.5) * 0.75rem)",
});
const unit = css({ fontSize: "sm", lineHeight: "tight", color: "text.subtle" });

export const DayCounterWidget = memo(function DayCounterWidget({ config }: WidgetRenderProps<DayCounterConfig>) {
  const { t, i18n } = useTranslation();
  const now = useNow(60_000);
  const target = parseLocalDateKey(config.targetDate);

  let value: string;
  let unitLabel: string;
  if (!target) {
    value = "—";
    unitLabel = "";
  } else {
    const { days, hoursLeft } = daysUntil(target, now);
    if (days === 0) {
      value = t("motivation-plugin.today");
      unitLabel = "";
    } else if (hoursLeft !== null) {
      value = formatDecimal(hoursLeft, i18n.language, 0);
      unitLabel = t("motivation-plugin.hoursLeft", { count: hoursLeft });
    } else if (days > 0) {
      value = formatDecimal(days, i18n.language, 0);
      unitLabel = t("motivation-plugin.daysLeft", { count: days });
    } else {
      value = formatDecimal(-days, i18n.language, 0);
      unitLabel = t("motivation-plugin.daysSince", { count: -days });
    }
  }

  return (
    <div className={root}>
      <Heading lineHeight="tight" className={title}>
        {config.title}
      </Heading>
      <div className={number}>{value}</div>
      {unitLabel && <div className={unit}>{unitLabel}</div>}
    </div>
  );
});
