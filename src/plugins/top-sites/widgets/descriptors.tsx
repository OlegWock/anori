import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { REQUIRED_PERMISSIONS, TopSitesWidget, TopSitesWidgetMock } from "./TopSitesWidget";

export const topSitesWidgetDescriptorHorizontal = defineWidget({
  id: "top-sites-horizontal",
  get name() {
    return translate("top-sites-plugin.widgetHorizontal");
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions compact permissions={REQUIRED_PERMISSIONS}>
      <TopSitesWidget type="horizontal" {...props} />
    </RequirePermissions>
  ),
  mock: () => <TopSitesWidgetMock type="horizontal" />,
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
      <TopSitesWidget type="vertical" {...props} />
    </RequirePermissions>
  ),
  mock: () => <TopSitesWidgetMock type="vertical" />,
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
