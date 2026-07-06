import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import type { EmptyObject } from "@anori/utils/types";
import { memo } from "react";
import { css } from "styled-system/css";
import { Calculator } from "./Calculator";

const widget = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textDecoration: "none",
  flexGrow: 1,
});

export const CalcWidget = memo(function CalcWidget(_props: WidgetRenderProps<EmptyObject>) {
  const meta = useWidgetMetadata();

  return (
    <div className={widget}>
      <Calculator showAdditionalButtons={meta.size.width > 2} showHistory={meta.size.height > 2} />
    </div>
  );
});
