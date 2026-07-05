import { Button } from "@anori/design-system/components/Button/Button";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { AnimatePresence, m } from "motion/react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

type EditModeToolbarProps = {
  visible: boolean;
  onAddWidget: () => void;
  onDone: () => void;
};

const toolbarAnimations = {
  transition: { ease: "easeOut", duration: 0.15 },
  initial: { opacity: 0, translateY: "1rem", translateX: "-50%" },
  animate: { opacity: 1, translateY: 0, translateX: "-50%" },
  exit: { opacity: 0, translateY: "1rem", translateX: "-50%" },
} as const;

const editToolbar = css({
  position: "absolute",
  bottom: "6",
  left: "50%",
  zIndex: "docked",
  display: "flex",
  alignItems: "center",
  gap: "2",
  padding: "2",
  borderRadius: "full",
  bg: "surface.elevated",
  boxShadow: "popover",
});

export const EditModeToolbar = memo(function EditModeToolbar({ visible, onAddWidget, onDone }: EditModeToolbarProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {visible && (
        <m.div key="edit-toolbar" className={editToolbar} {...toolbarAnimations}>
          <Button variant="secondary" iconStart={builtinIcons.add} onClick={onAddWidget}>
            {t("addWidget")}
          </Button>

          <Button variant="primary" iconStart={builtinIcons.check} onClick={onDone}>
            {t("done")}
          </Button>
        </m.div>
      )}
    </AnimatePresence>
  );
});
