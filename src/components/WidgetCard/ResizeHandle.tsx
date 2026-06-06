import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { Icon } from "@anori/components/icon/Icon";
import { useSizeSettings } from "@anori/utils/compact";
import clsx from "clsx";
import { m, type PanInfo } from "framer-motion";
import { floatingControl } from "./floatingControl";

type ResizeHandleProps = {
  onPanStart: () => void;
  onPan: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onPanEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
};

// The drag-to-resize handle at a widget card's bottom-right corner (edit mode). Pan logic lives in
// WidgetCard, which owns the size state; this just wires the gesture and renders the handle.
export const ResizeHandle = ({ onPanStart, onPan, onPanEnd }: ResizeHandleProps) => {
  const { rem } = useSizeSettings();
  return (
    <m.div
      className={clsx(floatingControl({ position: "resize" }), "widget-control")}
      onPointerDown={(e) => e.preventDefault()}
      onPanStart={onPanStart}
      onPan={onPan}
      onPanEnd={onPanEnd}
    >
      <Icon icon={builtinIcons.resize} width={rem(1.25)} height={rem(1.25)} style={{ rotate: 90 }} />
    </m.div>
  );
};
