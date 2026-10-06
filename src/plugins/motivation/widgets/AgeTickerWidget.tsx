import { formatDecimal } from "@anori/utils/format";
import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import { ageInYears, parseLocalDateKey } from "../periods";
import type { AgeTickerConfig } from "../types";

const root = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  flexGrow: 1,
  minHeight: 0,
  gap: "3",
});
const caption = css({ fontSize: "sm", lineHeight: "tight", textBox: "trim-both cap alphabetic" });
const number = cva({
  base: {
    fontWeight: "light",
    lineHeight: "none",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    textBox: "trim-both cap alphabetic",
  },
  variants: {
    wide: {
      true: { fontSize: "calc(1.9rem + var(--widget-box-percent, 0.5) * 0.8rem)" },
      false: { fontSize: "calc(1.35rem + var(--widget-box-percent, 0.5) * 0.5rem)" },
    },
  },
});

export const AgeTickerWidget = memo(function AgeTickerWidget({ config }: WidgetRenderProps<AgeTickerConfig>) {
  const { t, i18n } = useTranslation();
  const now = useNow(3000);
  const { size } = useWidgetMetadata();
  const dateOfBirth = parseLocalDateKey(config.dateOfBirth);
  if (!dateOfBirth) return null;
  const wide = size.width >= 2;
  const age = formatDecimal(ageInYears(dateOfBirth, now), i18n.language, wide ? 7 : 4);

  return (
    <div className={root}>
      <div className={caption}>{t("motivation-plugin.yourAge")}</div>
      <div className={number({ wide })}>{age}</div>
    </div>
  );
});
