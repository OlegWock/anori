import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { TimeProgressView } from "../components/TimeProgressView";
import { useCalendarAdapter } from "../hooks";
import { monthProgress } from "../periods";
import type { CalendarProgressConfig } from "../types";

export const MonthProgressWidget = memo(function MonthProgressWidget({
  config,
}: WidgetRenderProps<CalendarProgressConfig>) {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const calendar = useCalendarAdapter(config.calendar);
  const progress = monthProgress(now, calendar);

  return <TimeProgressView title={t("motivation-plugin.period.month")} progress={progress} precision="days" />;
});
