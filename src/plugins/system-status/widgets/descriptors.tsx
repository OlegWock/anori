import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { CpuWidgetScreen } from "./CpuWidget";
import { MemoryWidgetScreen } from "./MemoryWidget";

export const cpuWidgetDescriptor = defineWidget({
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

export const ramWidgetDescriptor = defineWidget({
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
