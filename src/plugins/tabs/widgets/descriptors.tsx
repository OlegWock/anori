import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import type { EmptyObject } from "@anori/utils/types";
import { RecentlyClosedWidget } from "./RecentlyClosedWidget";

export const widgetDescriptor = defineWidget<"recently-closed-widget", EmptyObject>({
  id: "recently-closed-widget",
  get name() {
    return translate("recently-closed-plugin.name");
  },
  // config-less widget — no schema (decode/encode pass through)
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
      max: { width: 5, height: 6 },
    },
    size: {
      width: 2,
      height: 2,
    },
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions permissions={["sessions", "tabs"]}>
      <RecentlyClosedWidget {...props} />
    </RequirePermissions>
  ),
  mock: () => <RecentlyClosedWidget config={{}} instanceId="mock" />,
});
