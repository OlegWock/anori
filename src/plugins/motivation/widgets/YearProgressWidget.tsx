import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { TimeProgressView } from "../components/TimeProgressView";
import { useCalendarAdapter } from "../hooks";
import { yearProgress } from "../periods";
import type { CalendarProgressConfig } from "../types";

export const YearProgressWidget = memo(function YearProgressWidget({
  config,
}: WidgetRenderProps<CalendarProgressConfig>) {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const calendar = useCalendarAdapter(config.calendar);
  const progress = yearProgress(now, calendar);

  return <TimeProgressView title={t("motivation-plugin.period.year")} progress={progress} precision="days" />;
});
