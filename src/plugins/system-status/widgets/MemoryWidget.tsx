import "../styles.scss";
import { isChromeLike } from "@anori/utils/browser";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { useEffect, useState } from "react";
import browser from "webextension-polyfill";

export const MemoryWidgetScreen = (_props: WidgetRenderProps<EmptyObject>) => {
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
    <div className="SystemStatusWidget">
      <div className="metric-value">{(allocatedMemory * 100).toFixed(1)}%</div>
      <div className="spacer" />
      <div className="metric-name">RAM</div>
    </div>
  );
};
