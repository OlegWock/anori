import type { MouseEvent, ReactNode } from "react";
import "./Hint.scss";
import { builtinIcons } from "@anori/utils/builtin-icons";
import clsx from "clsx";
import { Icon, type IconProps } from "./Icon";
import { Tooltip } from "./Tooltip";

export const Hint = ({
  content,
  className,
  hasClickableContent,
  ...props
}: { content: ReactNode; hasClickableContent?: boolean } & Omit<IconProps, "icon" | "ref">) => {
  const preventPropagation = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  return (
    <Tooltip label={content} maxWidth={400} hasClickableContent={hasClickableContent} enableOnTouch>
      <Icon
        icon={builtinIcons.helpCircle}
        className={clsx("Hint", className)}
        height={20}
        onClick={preventPropagation}
        onMouseDown={preventPropagation}
        onMouseUp={preventPropagation}
        onPointerDown={preventPropagation}
        onPointerUp={preventPropagation}
        {...props}
      />
    </Tooltip>
  );
};
