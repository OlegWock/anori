import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { formatDecimal } from "@anori/utils/format";
import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { SquareGrid } from "../components/SquareGrid";
import { ageInYears, parseLocalDateKey } from "../periods";
import type { LifeProgressConfig } from "../types";

const root = css({ display: "flex", flexGrow: 1, minHeight: 0, minWidth: 0 });

export const LifeProgressWidget = memo(function LifeProgressWidget({ config }: WidgetRenderProps<LifeProgressConfig>) {
  const { t, i18n } = useTranslation();
  const now = useNow(60_000);
  const dateOfBirth = parseLocalDateKey(config.dateOfBirth);
  if (!dateOfBirth) return null;

  const age = ageInYears(dateOfBirth, now);
  const total = config.lifespan;
  const filled = Math.min(total, Math.floor(age));
  const partial = filled < total ? age - filled : 0;
  const label = t("motivation-plugin.yearsLived", { lived: formatDecimal(age, i18n.language, 1), count: total });

  return (
    <Tooltip label={label} placement="top">
      <div className={root}>
        <SquareGrid total={total} filled={filled} partial={partial} />
      </div>
    </Tooltip>
  );
});
