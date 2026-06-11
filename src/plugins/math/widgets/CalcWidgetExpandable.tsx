import { WidgetExpandArea } from "@anori/components/WidgetExpandArea/WidgetExpandArea";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { useRunAfterNextRender } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import type { EmptyObject } from "@anori/utils/types";
import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { Calculator } from "./Calculator";

const expandTrigger = css({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
  alignSelf: "stretch",
  cursor: "pointer",
  textAlign: "start",
  "& svg": { color: "icon" },
});

export const CalcWidgetExpandable = (_props: WidgetRenderProps<EmptyObject>) => {
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
        className={expandTrigger}
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
          <WidgetExpandArea size={{ height: 600 }} title={t("math-plugin.calculator")} onClose={() => setShow(false)}>
            <Calculator showAdditionalButtons showHistory inputRef={inputRef} />
          </WidgetExpandArea>
        )}
      </AnimatePresence>
    </>
  );
};
