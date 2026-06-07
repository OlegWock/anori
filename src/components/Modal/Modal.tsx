import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { useHotkeys } from "@anori/utils/hooks";
import { useMotionTransition } from "@anori/utils/motion/hooks";
import clsx from "clsx";
import { LayoutGroup, m, useIsPresent } from "framer-motion";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import useMeasure from "react-use-motion-measure";
import { css } from "styled-system/css";

export type ModalProps = {
  title: string;
  children: ReactNode;
  headerButton?: ReactNode;
  layoutId?: string;
  closable?: boolean;
  closeOnClickOutside?: boolean;
  onClose?: () => void;
  className?: string;
};

const backdrop = css({
  position: "fixed",
  inset: 0,
  width: "100dvw",
  height: "100dvh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: "modal",
  padding: "4",
  background: "rgba(0, 0, 0, 0.5)",
});

// The animated-height wrapper owns the modal's (darker) surface + rounding.
const wrapper = css({
  borderRadius: "xl",
  bg: "modal",
  boxShadow: "modal.edge",
  overflow: "hidden",
});

const modalCss = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  color: "text.primary",
  padding: "6",
  maxWidth: "80dvw",
  maxHeight: "80dvh",
});

const headerCss = css({
  display: "flex",
  gap: "4",
  alignItems: "center",
  marginBottom: "6",
});

// Spin the close icon on hover (the old flourish), via the inner svg so the button's own transition
// is untouched.
const closeButton = css({
  "& svg": { transition: "transform 0.2s ease" },
  "&:hover svg": { transform: "rotate(180deg)" },
});

export const Modal = ({
  className,
  children,
  title,
  layoutId,
  closable,
  onClose,
  closeOnClickOutside,
  headerButton,
}: ModalProps) => {
  const { t } = useTranslation();
  useHotkeys("esc", () => {
    if (!closable || !onClose) return;
    onClose();
  });

  const [ref, bounds] = useMeasure();
  const isPresent = useIsPresent();

  const animatedHeight = useMotionTransition(bounds.height, { type: "tween", duration: 0.15, ignoreInitial: true });

  return createPortal(
    <m.div
      className={backdrop}
      onClick={() => closable && closeOnClickOutside && onClose?.()}
      initial={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      <m.div
        className={wrapper}
        initial={{ y: "-100%" }}
        exit={{ y: "-100%" }}
        animate={{ y: 0 }}
        style={{ height: isPresent ? animatedHeight : undefined }}
        transition={{ y: { duration: 0.2 } }}
      >
        <m.div className={clsx(modalCss, className)} onClick={(e) => e.stopPropagation()} layoutId={layoutId} ref={ref}>
          {/* `modal-header` marker kept for not-yet-migrated callers whose SCSS zeroes the modal
              padding and re-pads the header via a `.modal-header` descendant rule. */}
          <div className={clsx(headerCss, "modal-header")}>
            {headerButton}
            <Heading level={1} flexGrow={1}>
              {title}
            </Heading>
            {closable && (
              <IconButton
                variant="ghost"
                icon={builtinIcons.close}
                label={t("close")}
                onClick={onClose}
                className={closeButton}
                showTooltip={false}
              />
            )}
          </div>
          <LayoutGroup>{children}</LayoutGroup>
        </m.div>
      </m.div>
    </m.div>,
    document.body,
  );
};
