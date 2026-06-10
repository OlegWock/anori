import { Modal } from "@anori/design-system/components/Modal/Modal";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { WidgetDescriptor } from "@anori/utils/plugins/types";
import type { ID, Mapping } from "@anori/utils/types";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { m } from "framer-motion";
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
  widget: WidgetInFolderWithMeta<ID, WidgetDescriptor[], WidgetDescriptor>;
  onUpdateConfig: (instanceId: string, config: Partial<Mapping>) => void;
  onClose: () => void;
};

export const EditWidgetModal = ({ widget, onUpdateConfig, onClose }: EditWidgetModalProps) => {
  const { t } = useTranslation();
  const ConfigurationScreen = widget.widget.configurationScreen;
  if (!ConfigurationScreen) return null;

  return (
    <Modal title={t("editWidget")} flush onClose={onClose} closable>
      <ScrollArea className={scrollArea}>
        <m.div className={content} transition={{ duration: 0.18 }} animate={{ opacity: 1, translateX: "0%" }}>
          <ConfigurationScreen
            instanceId={widget.instanceId}
            widgetId={widget.widgetId}
            currentConfig={widget.configuration}
            saveConfiguration={(config) => {
              onUpdateConfig(widget.instanceId, config);
              onClose();
            }}
          />
        </m.div>
      </ScrollArea>
    </Modal>
  );
};
