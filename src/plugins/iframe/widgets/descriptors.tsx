import { RequirePermissions } from "@anori/components/RequirePermissions";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { parseHost } from "@anori/utils/misc";
import { defineWidget } from "@anori/utils/plugins/define";
import { dnrPermissions } from "@anori/utils/plugins/dnr";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useTranslation } from "react-i18next";
import type { IframePluginExpandableWidgetConfig, IframePluginWidgetConfig } from "../types";
import { ExpandableWidget } from "./ExpandableIframeWidget";
import { ExpandableWidgetConfigScreen } from "./ExpandableIframeWidgetConfig";
import { MainWidget } from "./IframeWidget";
import { MainWidgetConfigScreen } from "./IframeWidgetConfig";

export const widgetDescriptor = defineWidget({
  id: "iframe-widget",
  get name() {
    return translate("iframe-plugin.name");
  },
  configurationScreen: MainWidgetConfigScreen,
  mainScreen: (props: WidgetRenderProps<IframePluginWidgetConfig>) => {
    return (
      <RequirePermissions hosts={[parseHost(props.config.url)]} permissions={dnrPermissions}>
        <MainWidget {...props} />
      </RequirePermissions>
    );
  },
  mock: () => {
    return <MainWidget instanceId="mock" config={{ url: "http://example.com/", title: "", showLinkToPage: true }} />;
  },
  appearance: {
    size: {
      width: 2,
      height: 2,
    },
    resizable: {
      min: { width: 2, height: 2 },
    },
  },
});

export const widgetDescriptorExpandable = defineWidget({
  id: "iframe-widget-expandable",
  get name() {
    return translate("iframe-plugin.expandWidgetName");
  },
  configurationScreen: ExpandableWidgetConfigScreen,
  mainScreen: (props: WidgetRenderProps<IframePluginExpandableWidgetConfig>) => {
    return (
      <RequirePermissions
        compact
        hosts={[parseHost(props.config.url)]}
        className="rp-paddings"
        permissions={dnrPermissions}
      >
        <ExpandableWidget {...props} />
      </RequirePermissions>
    );
  },
  mock: () => {
    const { t } = useTranslation();
    return (
      <ExpandableWidget
        instanceId="mock"
        config={{ url: "http://example.com/", title: t("example"), icon: builtinIcons.compass, showLinkToPage: true }}
      />
    );
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    withHoverAnimation: true,
    withoutPadding: true,
    resizable: false,
  },
});
