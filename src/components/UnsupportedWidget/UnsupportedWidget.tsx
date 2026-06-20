import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { Icon } from "@anori/components/icon/Icon";
import { Tooltip } from "@anori/components/Tooltip";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import type { WidgetDescriptor } from "@anori/utils/plugins/types";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import "./UnsupportedWidget.scss";

const UnsupportedWidgetScreen = memo(function UnsupportedWidgetScreen() {
  const { t } = useTranslation();
  const { size } = useWidgetMetadata();
  const description = t("unsupportedWidget.description");

  const tiny = size.width <= 1 || size.height <= 1;
  const showDescription = !tiny && size.width * size.height > 4;

  const card = (
    <div className="UnsupportedWidget">
      <Icon className="UnsupportedWidget-icon" icon={builtinIcons.disconnected} width={44} height={44} />
      <div className="UnsupportedWidget-title">{t(tiny ? "unsupportedWidget.short" : "unsupportedWidget.title")}</div>
      {showDescription && <div className="UnsupportedWidget-description">{description}</div>}
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

const FALLBACK_APPEARANCE: WidgetDescriptor["appearance"] = {
  size: { width: 1, height: 1 },
  resizable: false,
};

export function makeUnsupportedWidgetDescriptor(original?: WidgetDescriptor): WidgetDescriptor {
  return {
    id: original?.id ?? "unsupported-widget",
    name: original?.name ?? "Unsupported widget",
    configurationScreen: null,
    mainScreen: UnsupportedWidgetScreen,
    mock: NoopMock,
    appearance: original?.appearance ?? FALLBACK_APPEARANCE,
  };
}

export const unsupportedWidgetPlugin = definePlugin({
  id: "unsupported-widget-plugin",
  name: "Unsupported widget",
  icon: builtinIcons.helpCircle,
  configurationScreen: null,
})
  .withWidgets(defineWidget(makeUnsupportedWidgetDescriptor()))
  .build();
