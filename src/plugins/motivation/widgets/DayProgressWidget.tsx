import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { TimeProgressView } from "../components/TimeProgressView";
import { dayProgress } from "../periods";
import type { DayProgressConfig } from "../types";

export const DayProgressWidget = memo(function DayProgressWidget({ config }: WidgetRenderProps<DayProgressConfig>) {
  const { t } = useTranslation();
  const now = useNow(30_000);
  const progress = dayProgress(now, config.countOnlyPart ? { start: config.start, end: config.end } : null);

  return <TimeProgressView title={t("motivation-plugin.period.day")} progress={progress} precision="minutes" />;
});
