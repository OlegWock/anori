import { AnoriPlugin, Folder, WidgetDescriptor } from "@utils/user-data/types";
import "./NewWidgetWizard.scss";
import { availablePluginsWithWidgets } from "@plugins/all";
import { WidgetCard } from "@components/WidgetCard";
import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Modal } from "@components/Modal";
import { Button } from "@components/Button";
import { Icon } from "@components/Icon";
import { useFolderWidgets } from "@utils/user-data/hooks";
import { GridDimensions, Layout, findPositionForItemInGrid } from "@utils/grid";
import { MotionScrollArea, ScrollArea } from "@components/ScrollArea";
import { useTranslation } from "react-i18next";
import { useDirection } from "@radix-ui/react-direction";
import { Input } from "@components/Input";

export type NewWidgetWizardProps = {
  folder: Folder;
  gridDimensions: GridDimensions;
  layout: Layout;
  onClose: () => void;
};

export const NewWidgetWizard = ({ onClose, folder, gridDimensions, layout }: NewWidgetWizardProps) => {
  const tryAddWidget = (plugin: AnoriPlugin, widget: WidgetDescriptor<any>, config: any) => {
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

  const onWidgetClick = (widget: WidgetDescriptor<any>, plugin: AnoriPlugin) => {
    if (widget.configurationScreen) {
      setSelectedPlugin(plugin);
      setSelectedWidget(widget);
    } else {
      tryAddWidget(plugin, widget, {});
    }
  };

  const { addWidget } = useFolderWidgets(folder);
  const [_searchQuery, setSearchQuery] = useState("");
  const searchQuery = _searchQuery.toLowerCase();
  const [selectedPlugin, setSelectedPlugin] = useState<AnoriPlugin | undefined>(undefined);
  const [selectedWidget, setSelectedWidget] = useState<WidgetDescriptor<any> | undefined>(undefined);
  const { t } = useTranslation();
  const dir = useDirection();

  console.log("Render NewWidgetWizard", { selectedPlugin, selectedWidget });
  const inConfigurationStage = !!(selectedPlugin && selectedWidget);

  const pluginsList = availablePluginsWithWidgets.filter((plugin) => {
    return (
      plugin.name.toLowerCase().includes(searchQuery) ||
      plugin.widgets.some((widget) => {
        if (Array.isArray(widget)) return widget.some((w) => w.name.toLowerCase().includes(searchQuery));
        return widget.name.toLowerCase().includes(searchQuery);
      })
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
            <Icon icon={dir === "ltr" ? "ion:arrow-back" : "ion:arrow-forward"} width={24} height={24} />
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
                          {plugin.widgets.map((widgetOrGroup, ind) => {
                            if (Array.isArray(widgetOrGroup)) {
                              return (
                                <div className="widgets-group" key={`group-${ind}`}>
                                  {widgetOrGroup.map((widget) => {
                                    return (
                                      <div key={widget.id} onClick={() => onWidgetClick(widget, plugin)}>
                                        <WidgetCard type="mock" widget={widget} plugin={plugin} />
                                        <div className="widget-name">{widget.name}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return (
                              <div key={widgetOrGroup.id} onClick={() => onWidgetClick(widgetOrGroup, plugin)}>
                                <WidgetCard type="mock" widget={widgetOrGroup} plugin={plugin} />
                                <div className="widget-name">{widgetOrGroup.name}</div>
                              </div>
                            );
                          })}
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
