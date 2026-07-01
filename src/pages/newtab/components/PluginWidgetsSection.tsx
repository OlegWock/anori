import { WidgetCard } from "@anori/components/WidgetCard/WidgetCard";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import { memo, type Ref } from "react";
import { css } from "styled-system/css";

export type PluginWidgetsSectionProps = {
  plugin: SomePlugin;
  onWidgetClick: (widget: SomeWidget, plugin: SomePlugin) => void;
  ref?: Ref<HTMLElement>;
};

const section = css({ display: "flex", flexDirection: "column", gap: "2" });
const mockBackground = css({ backgroundImage: "var(--background-image)", backgroundSize: "cover", borderRadius: "lg" });
const mocks = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: "3",
  padding: "3",
  borderRadius: "lg",
});
const widgetButton = css({ textAlign: "start", cursor: "pointer" });
const widgetName = css({ marginTop: "1-5", marginLeft: "2", wordWrap: "normal" });

export const PluginWidgetsSection = memo(function PluginWidgetsSection({
  plugin,
  onWidgetClick,
  ref,
}: PluginWidgetsSectionProps) {
  return (
    <section ref={ref} className={section}>
      <Heading level={2}>{plugin.name}</Heading>
      <div className={mockBackground}>
        <div className={mocks}>
          {plugin.widgets.map((widget) => (
            <div
              role="button"
              tabIndex={0}
              key={widget.id}
              className={widgetButton}
              onClick={() => onWidgetClick(widget, plugin)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onWidgetClick(widget, plugin);
              }}
            >
              <WidgetCard type="mock" widget={widget} plugin={plugin} />
              <div className={widgetName}>{widget.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
