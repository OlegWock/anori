import { LayoutGroup, m, useIsPresent } from "framer-motion";
import "./Modal.scss";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useHotkeys } from "@anori/utils/hooks";
import { useMotionTransition } from "@anori/utils/motion/hooks";
import clsx from "clsx";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import useMeasure from "react-use-motion-measure";
import { Icon } from "./icon/Icon";

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
  useHotkeys("esc", () => {
    if (!closable || !onClose) return;
    onClose();
  });

  const [ref, bounds] = useMeasure();
  const isPresent = useIsPresent();

  const animatedHeight = useMotionTransition(bounds.height, { type: "tween", duration: 0.15, ignoreInitial: true });

  return createPortal(
    <m.div
      className="Modal-backdrop"
      onClick={() => closable && closeOnClickOutside && onClose && onClose()}
      initial={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      <m.div
        className="Modal-wrapper"
        initial={{ y: "-100%" }}
        exit={{ y: "-100%" }}
        animate={{
          y: 0,
        }}
        style={{
          height: isPresent ? animatedHeight : undefined,
        }}
        transition={{
          y: {
            duration: 0.2,
          },
        }}
      >
        <m.div className={clsx("Modal", className)} onClick={(e) => e.stopPropagation()} layoutId={layoutId} ref={ref}>
          <div className="modal-header">
            {headerButton}
            <h1>{title}</h1>
            {closable && (
              <m.button
                className="close-button"
                onClick={onClose}
                whileHover={{
                  rotate: 180,
                  transition: { duration: 0.2 },
                }}
              >
                <Icon icon={builtinIcons.close} width={24} height={24} />
              </m.button>
            )}
          </div>
          <LayoutGroup>{children}</LayoutGroup>
        </m.div>
      </m.div>
    </m.div>,
    document.body,
  );
};
