import { isChromeLike } from "@anori/utils/browser";
import { formatPercent } from "@anori/utils/format";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import type { EmptyObject } from "@anori/utils/types";
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";
import { metricValue, spacer, widget } from "../styles";

export const MemoryWidgetScreen = memo(function MemoryWidgetScreen(_props: WidgetRenderProps<EmptyObject>) {
  const { i18n } = useTranslation();
  const [allocatedMemory, setAllocatedMemory] = useState(0);
  useEffect(() => {
    const load = async () => {
      if (!isChromeLike(browser)) {
        return;
      }
      const results = await browser.system.memory.getInfo();
      const usedCapacity = results.capacity - results.availableCapacity;
      setAllocatedMemory(usedCapacity / results.capacity);
    };
    load();

    const tid = setInterval(() => load(), 1000 * 30);
    return () => clearInterval(tid);
  }, []);

  return (
    <div className={widget}>
      <div className={metricValue}>{formatPercent(allocatedMemory, i18n.language, 1)}</div>
      <div className={spacer} />
      <div>RAM</div>
    </div>
  );
});
