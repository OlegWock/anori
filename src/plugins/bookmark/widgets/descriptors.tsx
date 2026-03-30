import { RequirePermissions } from "@anori/components/RequirePermissions";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { parseHost } from "@anori/utils/misc";
import { defineWidget } from "@anori/utils/plugins/define";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useTranslation } from "react-i18next";
import type { BookmarkGroupWidgetConfig, BookmarkWidgetConfig } from "../types";
import { BookmarkGroupWidget } from "./BookmarkGroupWidget";
import { BookmarGroupkWidgetConfigScreen } from "./BookmarkGroupWidgetConfig";
import { BookmarkWidget } from "./BookmarkWidget";
import { BookmarkWidgetConfigScreen } from "./BookmarkWidgetConfig";

export const bookmarkWidgetDescriptor = defineWidget({
  id: "bookmark",
  get name() {
    return translate("bookmark-plugin.widgetName");
  },
  configurationScreen: BookmarkWidgetConfigScreen,
  mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfig>) => {
    const { t } = useTranslation();
    return (
      <RequirePermissions
        className="rp-paddings"
        additionalInfo={t("bookmark-plugin.permissionExplanation")}
        hosts={[parseHost(config.url)]}
        enabled={config.checkStatus === true}
        compact
      >
        <BookmarkWidget instanceId={instanceId} config={config} isMock={false} />
      </RequirePermissions>
    );
  },
  mock: () => {
    const { t } = useTranslation();
    return (
      <BookmarkWidget
        instanceId=""
        isMock
        config={{
          url: "http://example.com",
          title: t("example"),
          icon: builtinIcons.dice,
        }}
      />
    );
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: {
      min: { width: 1, height: 1 },
      max: { width: 2, height: 1 },
    },
    withHoverAnimation: true,
    withoutPadding: true,
  },
});

export const bookmarkGroupWidgetDescriptor = defineWidget({
  id: "bookmark-group",
  get name() {
    return translate("bookmark-plugin.groupWidgetName");
  },
  configurationScreen: BookmarGroupkWidgetConfigScreen,
  mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkGroupWidgetConfig>) => {
    return <BookmarkGroupWidget instanceId={instanceId} config={config} isMock={false} />;
  },
  mock: () => {
    const { t } = useTranslation();
    return (
      <BookmarkGroupWidget
        instanceId=""
        isMock
        config={{
          urls: ["http://example.com"],
          openInTabGroup: false,
          title: t("example"),
          icon: builtinIcons.cloud,
        }}
      />
    );
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: {
      min: { width: 1, height: 1 },
      max: { width: 2, height: 1 },
    },
    withHoverAnimation: true,
    withoutPadding: true,
  },
});
