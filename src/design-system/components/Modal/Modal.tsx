import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { useHotkeys } from "@anori/utils/hooks";
import { useMotionTransition } from "@anori/utils/motion/hooks";
import { LayoutGroup, m, useIsPresent } from "motion/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import useMeasure from "react-use-motion-measure";
import { css, cx } from "styled-system/css";

export type ModalProps = {
  title: string;
  children: ReactNode;
  headerButton?: ReactNode;
  layoutId?: string;
  closable?: boolean;
  closeOnClickOutside?: boolean;
  onClose?: () => void;
  className?: string;
  // Drop the body padding so content can sit edge-to-edge (it pads itself); the header stays inset.
  flush?: boolean;
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

const wrapper = css({
  borderRadius: "xl",
  bg: "surface",
  boxShadow: "surface.edge",
  overflow: "hidden",
});

const modalCss = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  color: "text.primary",
  maxWidth: "80dvw",
  maxHeight: "80dvh",
});
const contentPadding = css({ padding: "6" });

const headerCss = css({
  display: "flex",
  gap: "8",
  alignItems: "center",
  marginBottom: "6",
});
const headerFlushPadding = css({ pt: "6", px: "6" });

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
  flush,
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
        <m.div
          className={cx(modalCss, !flush && contentPadding, className)}
          onClick={(e) => e.stopPropagation()}
          layoutId={layoutId}
          ref={ref}
        >
          <div className={cx(headerCss, flush && headerFlushPadding)}>
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
