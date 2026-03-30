import { defineWidget } from "@anori/utils/plugins/define";
import { ExpandableTestWidget } from "./ExpandableTestWidget";
import { ResizableTestWidget } from "./ResizableTestWidget";

export const expandableWidgetDescriptor = defineWidget({
  id: "widget",
  get name() {
    return "Expandable widget";
  },
  configurationScreen: null,
  mainScreen: ExpandableTestWidget,
  mock: () => {
    return <ExpandableTestWidget instanceId="mock" config={{}} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: false,
    withHoverAnimation: true,
    withoutPadding: true,
  },
});

export const resizableWidgetDescriptor = defineWidget({
  id: "widget-2",
  get name() {
    return "Resizable widget";
  },
  configurationScreen: null,
  mainScreen: ResizableTestWidget,
  mock: () => {
    return <ResizableTestWidget instanceId="mock" config={{}} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: {
      min: {
        width: 1,
        height: 1,
      },
      max: {
        width: 5,
        height: 4,
      },
    },
    withHoverAnimation: false,
    withoutPadding: true,
  },
});
