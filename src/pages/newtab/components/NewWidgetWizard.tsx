import { Alert } from "@anori/design-system/components/Alert/Alert";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { MenuItem, MenuList } from "@anori/design-system/components/MenuList/MenuList";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { MotionScrollArea, ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { availablePluginsWithWidgets } from "@anori/plugins/all";
import type { GridContent, GridDimensions } from "@anori/utils/grid/types";
import { findPositionForItemInGrid } from "@anori/utils/grid/utils";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import { isWidgetNonConfigurable } from "@anori/utils/plugins/widget";
import type { Mapping } from "@anori/utils/types";
import { useFolderWidgets } from "@anori/utils/user-data/hooks";
import type { Folder } from "@anori/utils/user-data/types";
import { useDirection } from "@radix-ui/react-direction";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";
import { PluginWidgetsSection } from "./PluginWidgetsSection";

export type NewWidgetWizardProps = {
  folder: Folder;
  gridDimensions: GridDimensions;
  layout: GridContent;
  onClose: () => void;
};

const content = css({
  maxWidth: "min(80vw, 1100px)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: "4",
  px: "4",
  pb: "4",
});
const pluginsScreen = css({
  width: "min(80vw, 1100px)",
});
const configScreen = css({ width: "500px" });
const searchInput = css({ margin: "0-5", width: "100%" });
const twoColumn = css({ display: "flex", gap: "4", overflow: "hidden" });
const sidebar = css({ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column" });
const pluginsListScroll = css({ flex: 1 });
const divider = css({
  alignSelf: "stretch",
  borderRightWidth: "1px",
  borderRightStyle: "solid",
  borderRightColor: "divider",
});
const widgetsArea = css({ flex: 1, paddingInline: "4" });
const widgetsContent = css({ display: "flex", flexDirection: "column", gap: "6" });

export const NewWidgetWizard = ({ onClose, folder, gridDimensions, layout }: NewWidgetWizardProps) => {
  const { addWidget } = useFolderWidgets(folder);
  const [_searchQuery, setSearchQuery] = useState("");
  const searchQuery = useDeferredValue(_searchQuery).toLowerCase();
  const [selectedPlugin, setSelectedPlugin] = useState<SomePlugin | undefined>(undefined);
  const [selectedWidget, setSelectedWidget] = useState<SomeWidget | undefined>(undefined);
  const [addFailed, setAddFailed] = useState(false);
  const { t } = useTranslation();
  const dir = useDirection();
  const pluginSectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const tryAddWidget = useCallback(
    async (plugin: SomePlugin, widget: SomeWidget, config: Mapping) => {
      let position = findPositionForItemInGrid({ grid: gridDimensions, layout, item: widget.appearance.size });
      if (!position) {
        const numberOfColumns = Math.max(...layout.map((w) => w.x + w.width), 0);
        position = {
          x: numberOfColumns,
          y: 0,
        };
      }
      try {
        const { instanceId } = await addWidget({ plugin, widget, config, position });
        setTimeout(() => {
          document.querySelector(`#WidgetCard-${instanceId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }, 200);
        onClose();
      } catch (e) {
        // Write was blocked (config failed validation) — keep the wizard open instead of persisting bad config.
        console.error("Failed to add widget", e);
        setAddFailed(true);
      }
    },
    [gridDimensions, layout, addWidget, onClose],
  );

  const onWidgetClick = useCallback(
    (widget: SomeWidget, plugin: SomePlugin) => {
      setAddFailed(false);
      if (isWidgetNonConfigurable(widget)) {
        tryAddWidget(plugin, widget, {});
      } else {
        setSelectedPlugin(plugin);
        setSelectedWidget(widget);
      }
    },
    [tryAddWidget],
  );

  const inConfigurationStage = !!(selectedPlugin && selectedWidget);

  const pluginsList = useMemo(
    () =>
      availablePluginsWithWidgets.filter((plugin) => {
        return (
          plugin.name.toLowerCase().includes(searchQuery) ||
          plugin.widgets.some((widget) => widget.name.toLowerCase().includes(searchQuery))
        );
      }),
    [searchQuery],
  );

  const scrollToPlugin = (pluginId: string) => {
    const section = pluginSectionRefs.current[pluginId];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Modal
      title={inConfigurationStage ? t("configureWidget") : t("addWidget")}
      headerButton={
        inConfigurationStage ? (
          <IconButton
            variant="ghost"
            icon={dir === "ltr" ? builtinIcons.chevronBack : builtinIcons.chevronForward}
            label={t("back")}
            onClick={() => {
              setSelectedPlugin(undefined);
              setSelectedWidget(undefined);
            }}
          />
        ) : undefined
      }
      closable
      onClose={onClose}
      flush
    >
      <AnimatePresence initial={false} mode="wait">
        {inConfigurationStage && !!selectedWidget.configurationScreen && (
          <MotionScrollArea
            key="configuration"
            className={cx(content, configScreen)}
            transition={{ duration: 0.18 }}
            initial={{ translateX: "-50%", opacity: 0 }}
            animate={{ translateX: "0%", opacity: 1 }}
            exit={{ translateX: "-50%", opacity: 0 }}
          >
            {addFailed && <Alert variant="danger">{t("addWidgetConfigInvalid")}</Alert>}
            <selectedWidget.configurationScreen
              widgetId={selectedWidget.id}
              saveConfiguration={(config) => tryAddWidget(selectedPlugin, selectedWidget, config as Mapping)}
            />
          </MotionScrollArea>
        )}

        {!inConfigurationStage && (
          <m.div
            key="select"
            className={cx(content, pluginsScreen)}
            transition={{ duration: 0.18 }}
            initial={{ translateX: "50%", opacity: 0 }}
            animate={{ translateX: "0%", opacity: 1 }}
            exit={{ translateX: "50%", opacity: 0 }}
          >
            <Input
              className={searchInput}
              value={_searchQuery}
              onValueChange={setSearchQuery}
              placeholder={t("search")}
              autoFocus
            />

            {pluginsList.length === 0 ? (
              <EmptyState title={t("noResults")} />
            ) : (
              <div className={twoColumn}>
                <div className={sidebar}>
                  <ScrollArea className={pluginsListScroll}>
                    <MenuList>
                      {pluginsList.map((plugin) => (
                        <MenuItem key={plugin.id} icon={plugin.icon} onClick={() => scrollToPlugin(plugin.id)}>
                          {plugin.name}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </ScrollArea>
                </div>

                <div className={divider} />

                <ScrollArea className={widgetsArea}>
                  <div className={widgetsContent}>
                    {pluginsList.map((plugin) => (
                      <PluginWidgetsSection
                        key={plugin.id}
                        plugin={plugin}
                        onWidgetClick={onWidgetClick}
                        ref={(el) => {
                          pluginSectionRefs.current[plugin.id] = el;
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};
