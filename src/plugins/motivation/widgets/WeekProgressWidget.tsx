import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { TimeProgressView } from "../components/TimeProgressView";
import { fullWeekProgress, partialWeekProgress } from "../periods";
import type { WeekProgressConfig } from "../types";

export const WeekProgressWidget = memo(function WeekProgressWidget({ config }: WidgetRenderProps<WeekProgressConfig>) {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const progress = config.countOnlyPart
    ? partialWeekProgress(now, config.days)
    : fullWeekProgress(now, config.firstDay);

  return <TimeProgressView title={t("motivation-plugin.period.week")} progress={progress} precision="hours" />;
});
