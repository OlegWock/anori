import { WidgetHeader } from "@anori/components/WidgetHeader/WidgetHeader";
import { type DurationPrecision, formatDuration, formatPercent } from "@anori/utils/format";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";
import type { Progress } from "../periods";
import { DonutChart } from "./DonutChart";
import { SegmentedBar } from "./SegmentedBar";

const root = css({ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, minWidth: 0 });
const barLayout = css({ justifyContent: "space-between" });

export type TimeProgressViewProps = {
  title: string;
  progress: Progress;
  precision: DurationPrecision;
};

export const TimeProgressView = ({ title, progress, precision }: TimeProgressViewProps) => {
  const { t, i18n } = useTranslation();
  const { size } = useWidgetMetadata();
  const elapsedPercent = formatPercent(progress.fraction, i18n.language);
  const remainingPercent = formatPercent(1 - progress.fraction, i18n.language);

  const elapsedTooltip = t("motivation-plugin.elapsedTooltip", {
    percent: elapsedPercent,
    duration: formatDuration(t, progress.elapsedMs, precision),
  });
  const remainingTooltip = t("motivation-plugin.remainingTooltip", {
    percent: remainingPercent,
    duration: formatDuration(t, progress.remainingMs, precision),
  });

  if (size.width < 2) {
    return (
      <div className={root}>
        <DonutChart
          fraction={progress.fraction}
          label={title}
          elapsedTooltip={elapsedTooltip}
          remainingTooltip={remainingTooltip}
        />
      </div>
    );
  }

  return (
    <div className={cx(root, barLayout)}>
      <WidgetHeader title={title} />
      <SegmentedBar
        fraction={progress.fraction}
        elapsedLabel={elapsedPercent}
        remainingLabel={remainingPercent}
        elapsedTooltip={elapsedTooltip}
        remainingTooltip={remainingTooltip}
      />
    </div>
  );
};
