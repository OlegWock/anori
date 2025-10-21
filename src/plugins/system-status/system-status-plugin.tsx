import "./styles.scss";
import { translate } from "@anori/translations/index";
import { isChromeLike } from "@anori/utils/browser";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { useState } from "react";
import { useEffect } from "react";
import browser from "webextension-polyfill";

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const avg = (arr: number[]) => (arr.length === 0 ? 0 : sum(arr) / arr.length);

const CpuWidgetScreen = (_props: WidgetRenderProps<EmptyObject>) => {
  const [load, setLoad] = useState(0);
  useEffect(() => {
    const load = async () => {
      if (!isChromeLike(browser)) {
        return;
      }
      const results = await browser.system.cpu.getInfo();
      const cpuTime: CpuTime[] = results.processors.map((t) => t.usage);
      if (lastResults) {
        const load = lastResults.map((last, ind) => {
          const current = cpuTime[ind];
          const totalDiff = current.total - last.total;
          const spentIdle = current.idle - last.idle;
          return 1 - spentIdle / totalDiff;
        });
        const avgLoad = avg(load);
        setLoad(avgLoad);
      }
      lastResults = cpuTime;
    };
    load();

    let lastResults: null | CpuTime[] = null;
    const tid = setInterval(() => load(), 3000);

    const manualTids = [setTimeout(() => load(), 500), setTimeout(() => load(), 1000), setTimeout(() => load(), 2000)];
    return () => {
      clearInterval(tid);
      manualTids.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="SystemStatusWidget">
      <div className="metric-value">{(load * 100).toFixed(1)}%</div>
      <div className="spacer" />
      <div className="metric-name">CPU</div>
    </div>
  );
};

const MemoryWidgetScreen = (_props: WidgetRenderProps<EmptyObject>) => {
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

const cpuWidgetDescriptor = defineWidget({
  id: "cpu-load-status",
  get name() {
    return translate("system-status-plugin.cpuLoad");
  },
  appearance: {
    resizable: false,
    size: {
      width: 1,
      height: 1,
    },
  },
  configurationScreen: null,
  mainScreen: CpuWidgetScreen,
  mock: () => <CpuWidgetScreen config={{}} instanceId="mock" />,
});

const ramWidgetDescriptor = defineWidget({
  id: "ram-load-status",
  get name() {
    return translate("system-status-plugin.ramLoad");
  },
  appearance: {
    resizable: false,
    size: {
      width: 1,
      height: 1,
    },
  },
  configurationScreen: null,
  mainScreen: MemoryWidgetScreen,
  mock: () => <MemoryWidgetScreen config={{}} instanceId="mock" />,
});

export const systemStatusPlugin = definePlugin({
  id: "system-status-plugin",
  get name() {
    return translate("system-status-plugin.name");
  },
  configurationScreen: null,
}).withWidgets(cpuWidgetDescriptor, ramWidgetDescriptor);
