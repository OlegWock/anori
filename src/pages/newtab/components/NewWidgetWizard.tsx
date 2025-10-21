import type { Folder } from "@anori/utils/user-data/types";
import "./NewWidgetWizard.scss";
import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import { Modal } from "@anori/components/Modal";
import { MotionScrollArea, ScrollArea } from "@anori/components/ScrollArea";
import { WidgetCard } from "@anori/components/WidgetCard";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { availablePluginsWithWidgets } from "@anori/plugins/all";
import { type GridDimensions, type Layout, findPositionForItemInGrid } from "@anori/utils/grid";
import type { AnoriPlugin, ConfigFromWidgetDescriptor, WidgetDescriptor } from "@anori/utils/plugins/types";
import { isWidgetNonConfigurable } from "@anori/utils/plugins/widget";
import type { Mapping } from "@anori/utils/types";
import { useFolderWidgets } from "@anori/utils/user-data/hooks";
import { useDirection } from "@radix-ui/react-direction";
import { AnimatePresence, m } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type NewWidgetWizardProps = {
  folder: Folder;
  gridDimensions: GridDimensions;
  layout: Layout;
  onClose: () => void;
};

export const NewWidgetWizard = ({ onClose, folder, gridDimensions, layout }: NewWidgetWizardProps) => {
  const tryAddWidget = <WD extends WidgetDescriptor[], W extends WD[number]>(
    plugin: AnoriPlugin<string, Mapping, WD>,
    widget: W,
    config: ConfigFromWidgetDescriptor<W>,
  ) => {
    console.log({ gridDimensions, layout });
    let position = findPositionForItemInGrid({ grid: gridDimensions, layout, item: widget.appearance.size });
    if (!position) {
      const numberOfColumns = Math.max(...layout.map((w) => w.x + w.width), 0);
      position = {
        x: numberOfColumns,
        y: 0,
      };
    }
    const { instanceId } = addWidget({ plugin, widget, config, position });
    setTimeout(() => {
      document.querySelector(`#WidgetCard-${instanceId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }, 200);
    onClose();
  };

  const onWidgetClick = <WD extends WidgetDescriptor[], W extends WD[number]>(
    widget: W,
    plugin: AnoriPlugin<string, Mapping, WD>,
  ) => {
    if (isWidgetNonConfigurable(widget)) {
      tryAddWidget(plugin, widget, {} as ConfigFromWidgetDescriptor<typeof widget>);
    } else {
      setSelectedPlugin(plugin);
      setSelectedWidget(widget);
    }
  };

  const { addWidget } = useFolderWidgets(folder);
  const [_searchQuery, setSearchQuery] = useState("");
  const searchQuery = _searchQuery.toLowerCase();
  const [selectedPlugin, setSelectedPlugin] = useState<AnoriPlugin | undefined>(undefined);
  const [selectedWidget, setSelectedWidget] = useState<WidgetDescriptor | undefined>(undefined);
  const { t } = useTranslation();
  const dir = useDirection();

  console.log("Render NewWidgetWizard", { selectedPlugin, selectedWidget });
  const inConfigurationStage = !!(selectedPlugin && selectedWidget);

  const pluginsList = availablePluginsWithWidgets.filter((plugin) => {
    return (
      plugin.name.toLowerCase().includes(searchQuery) ||
      plugin.widgets.some((widget) => widget.name.toLowerCase().includes(searchQuery))
    );
  });

  return (
    <Modal
      title={inConfigurationStage ? t("configureWidget") : t("addWidget")}
      headerButton={
        inConfigurationStage ? (
          <Button
            withoutBorder
            onClick={() => {
              setSelectedPlugin(undefined);
              setSelectedWidget(undefined);
            }}
          >
            <Icon
              icon={dir === "ltr" ? builtinIcons.chevronBack : builtinIcons.chevronForward}
              width={24}
              height={24}
            />
          </Button>
        ) : undefined
      }
      closable
      onClose={onClose}
      className="NewWidgetWizard-wrapper"
    >
      <ScrollArea className="NewWidgetWizard-scrollarea">
        <AnimatePresence initial={false} mode="wait">
          {inConfigurationStage && !!selectedWidget.configurationScreen && (
            <m.div
              key="configuration"
              className="NewWidgetWizard"
              transition={{ duration: 0.18 }}
              initial={{ translateX: "-50%", opacity: 0 }}
              animate={{ translateX: "0%", opacity: 1 }}
              exit={{ translateX: "-50%", opacity: 0 }}
            >
              <selectedWidget.configurationScreen
                widgetId={selectedWidget.id}
                saveConfiguration={(config) => tryAddWidget(selectedPlugin, selectedWidget, config)}
              />
            </m.div>
          )}

          {!inConfigurationStage && (
            <MotionScrollArea
              key="select"
              className="NewWidgetWizard"
              transition={{ duration: 0.18 }}
              initial={{ translateX: "50%", opacity: 0 }}
              animate={{ translateX: "0%", opacity: 1 }}
              exit={{ translateX: "50%", opacity: 0 }}
            >
              <div className="new-widget-content">
                <Input className="search-input" value={_searchQuery} onValueChange={setSearchQuery} autoFocus />
                {pluginsList.map((plugin) => {
                  return (
                    <section key={plugin.id}>
                      <h2>{plugin.name}</h2>
                      <div className="widgets-mock-background">
                        <div className="widgets-mocks">
                          {plugin.widgets.map((widget) => (
                            <div
                              role="button"
                              tabIndex={0}
                              key={widget.id}
                              onClick={() => onWidgetClick(widget, plugin)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  onWidgetClick(widget, plugin);
                                }
                              }}
                            >
                              <WidgetCard type="mock" widget={widget} plugin={plugin} />
                              <div className="widget-name">{widget.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </MotionScrollArea>
          )}
        </AnimatePresence>
      </ScrollArea>
    </Modal>
  );
};
