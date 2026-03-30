import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { MainScreen } from "./CalcWidget";
import { MainScreenExpandable } from "./CalcWidgetExpandable";

export const widgetDescriptor = defineWidget({
  id: "calc-widget",
  get name() {
    return translate("math-plugin.calculator");
  },
  configurationScreen: null,
  mainScreen: MainScreen,
  mock: () => {
    return <MainScreen instanceId="mock" config={{}} />;
  },
  appearance: {
    size: {
      width: 2,
      height: 2,
    },
    resizable: {
      min: {
        width: 2,
        height: 2,
      },
      max: {
        width: 4,
        height: 5,
      },
    },
  },
});

export const expandableWidgetDescriptor = defineWidget({
  id: "calc-widget-expandable",
  get name() {
    return translate("math-plugin.expandWidgetName");
  },
  configurationScreen: null,
  mainScreen: MainScreenExpandable,
  mock: () => {
    return <MainScreenExpandable instanceId="mock" config={{}} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: false,
    withoutPadding: true,
    withHoverAnimation: true,
  },
});
