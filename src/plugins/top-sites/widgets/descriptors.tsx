import { RequirePermissions } from "@anori/components/RequirePermissions";
import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { MainScreen, Mock, REQUIRED_PERMISSIONS } from "./TopSitesWidget";

export const topSitesWidgetDescriptorHorizontal = defineWidget({
  id: "top-sites-horizontal",
  get name() {
    return translate("top-sites-plugin.widgetHorizontal");
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions compact permissions={REQUIRED_PERMISSIONS}>
      <MainScreen type="horizontal" {...props} />
    </RequirePermissions>
  ),
  mock: () => <Mock type="horizontal" />,
  appearance: {
    size: {
      width: 4,
      height: 1,
    },
    resizable: {
      min: {
        width: 4,
        height: 1,
      },
      max: {
        width: 4,
        height: 2,
      },
    },
  },
});

export const topSitesWidgetDescriptorVertical = defineWidget({
  id: "top-sites-vertical",
  get name() {
    return translate("top-sites-plugin.widgetVertical");
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions compact permissions={REQUIRED_PERMISSIONS}>
      <MainScreen type="vertical" {...props} />
    </RequirePermissions>
  ),
  mock: () => <Mock type="vertical" />,
  appearance: {
    size: {
      width: 1,
      height: 4,
    },
    resizable: {
      min: {
        width: 1,
        height: 4,
      },
      max: {
        width: 2,
        height: 4,
      },
    },
  },
});
