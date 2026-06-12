import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { Mapping } from "@anori/utils/types";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { m } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const scrollArea = css({
  marginTop: 0,
  marginInline: "1-5",
  marginBottom: "3",
  "& .ScrollAreaViewport": { padding: "1" },
});
const content = css({
  paddingTop: 0,
  paddingInline: "3",
  paddingBottom: "3",
  width: "500px",
  maxWidth: "80vw",
  overflow: "hidden",
});

type EditWidgetModalProps = {
  widget: WidgetInFolderWithMeta;
  onUpdateConfig: (instanceId: string, config: Partial<Mapping>) => void;
  onClose: () => void;
};

export const EditWidgetModal = ({ widget, onUpdateConfig, onClose }: EditWidgetModalProps) => {
  const { t } = useTranslation();
  const [saveFailed, setSaveFailed] = useState(false);
  const ConfigurationScreen = widget.widget.configurationScreen;
  const currentConfig = useMemo(() => {
    try {
      return widget.widget.parse(widget.configuration);
    } catch (e) {
      // Start the form from defaults rather than blocking — lets the user re-save a valid config.
      console.error(`Failed to parse config for widget "${widget.widgetId}"`, e);
      return undefined;
    }
  }, [widget.widget, widget.configuration, widget.widgetId]);
  if (!ConfigurationScreen) return null;

  return (
    <Modal title={t("editWidget")} flush onClose={onClose} closable>
      <ScrollArea className={scrollArea}>
        <m.div className={content} transition={{ duration: 0.18 }} animate={{ opacity: 1, translateX: "0%" }}>
          {saveFailed && <Alert variant="danger">{t("saveWidgetConfigInvalid")}</Alert>}
          <ConfigurationScreen
            instanceId={widget.instanceId}
            widgetId={widget.widgetId}
            currentConfig={currentConfig}
            saveConfiguration={async (config: unknown) => {
              try {
                await onUpdateConfig(widget.instanceId, config as Partial<Mapping>);
                onClose();
              } catch (e) {
                // Write was blocked (config failed validation) — keep the modal open so the change isn't lost.
                console.error("Failed to save widget configuration", e);
                setSaveFailed(true);
              }
            }}
          />
        </m.div>
      </ScrollArea>
    </Modal>
  );
};
