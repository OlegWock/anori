import { WidgetExpandArea } from "@anori/components/WidgetExpandArea";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { useRunAfterNextRender } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./CalcWidget.scss";
import "./CalcWidgetExpandable.scss";
import { Calculator } from "./Calculator";

export const MainScreenExpandable = (_props: WidgetRenderProps<EmptyObject>) => {
  const [show, setShow] = useState(false);
  const { rem } = useSizeSettings();
  const runAfterRender = useRunAfterNextRender();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const trackInteraction = useWidgetInteractionTracker();

  return (
    <>
      <button
        type="button"
        className="CalculatorWidgetExpandable"
        onClick={() => {
          trackInteraction("Expand");
          if (!show) {
            setShow(true);
            runAfterRender(() => {
              inputRef.current?.focus();
            });
          }
        }}
      >
        <Icon icon={builtinIcons.calculator} width={rem(5)} height={rem(5)} />
      </button>
      <AnimatePresence>
        {show && (
          <WidgetExpandArea
            size={{ height: 600 }}
            title={t("math-plugin.calculator")}
            className="CalculatorWidgetExpandArea"
            onClose={() => setShow(false)}
          >
            <Calculator showAdditionalButtons showHistory inputRef={inputRef} />
          </WidgetExpandArea>
        )}
      </AnimatePresence>
    </>
  );
};
