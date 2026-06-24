import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { translate } from "@anori/translations/utils";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import type { SomeWidget } from "@anori/utils/plugins/types";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const root = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1-5",
  height: "100%",
  width: "100%",
  padding: "2",
  textAlign: "center",
  color: "text.subtle",
});
const titleCss = css({ fontWeight: "medium" });
const descriptionCss = css({ fontSize: "xs", color: "text.placeholder", lineHeight: "tight" });
const iconCss = css({ color: "icon.subtle" });

// Placeholder shown for a widget whose plugin isn't available in the current browser. It keeps the
// widget's footprint so the grid layout (and the widget itself, on other synced browsers) is preserved.
const UnsupportedWidgetScreen = memo(function UnsupportedWidgetScreen() {
  const { t } = useTranslation();
  const { size } = useWidgetMetadata();
  const description = t("unsupportedWidget.description");

  const tiny = size.width <= 1 || size.height <= 1;
  const showDescription = !tiny && size.width * size.height > 4;

  const card = (
    <div className={root}>
      <Icon className={iconCss} icon={builtinIcons.disconnected} width={44} height={44} />
      <div className={titleCss}>{t(tiny ? "unsupportedWidget.short" : "unsupportedWidget.title")}</div>
      {showDescription && <div className={descriptionCss}>{description}</div>}
    </div>
  );

  if (showDescription) return card;
  return (
    <Tooltip label={description} maxWidth={260}>
      {card}
    </Tooltip>
  );
});

const NoopMock = () => null;

const unsupportedWidgetDescriptor = defineWidget({
  id: "unsupported-widget",
  get name() {
    return translate("unsupportedWidget.title");
  },
  configurationScreen: null,
  mainScreen: UnsupportedWidgetScreen,
  mock: NoopMock,
  appearance: {
    size: { width: 1, height: 1 },
    resizable: false,
  },
});

export const unsupportedWidgetPlugin = definePlugin({
  id: "unsupported-widget-plugin",
  get name() {
    return translate("unsupportedWidget.title");
  },
  icon: builtinIcons.helpCircle,
  widgets: [unsupportedWidgetDescriptor],
}).build();

const baseUnsupportedWidget = unsupportedWidgetPlugin.widgets[0];

// Wraps a widget that can't be rendered (its plugin isn't available here): keeps the original's id, name,
// and appearance so the grid slot is unchanged, but swaps in the placeholder screen and a passthrough
// config seam (the stored config is preserved untouched for other browsers).
export function makeUnsupportedWidgetDescriptor(original?: SomeWidget): SomeWidget {
  if (!original) return baseUnsupportedWidget;
  return {
    ...original,
    decode: baseUnsupportedWidget.decode,
    encode: baseUnsupportedWidget.encode,
    mainScreen: baseUnsupportedWidget.mainScreen,
    configurationScreen: null,
    mock: baseUnsupportedWidget.mock,
  };
}
