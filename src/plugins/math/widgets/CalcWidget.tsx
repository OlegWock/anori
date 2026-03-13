import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import type { EmptyObject } from "@anori/utils/types";
import "./CalcWidget.scss";
import { Calculator } from "./Calculator";

export const MainScreen = (_props: WidgetRenderProps<EmptyObject>) => {
  const meta = useWidgetMetadata();

  return (
    <div className="CalculatorWidget">
      <Calculator showAdditionalButtons={meta.size.width > 2} showHistory={meta.size.height > 2} />
    </div>
  );
};
