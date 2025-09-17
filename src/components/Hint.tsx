import type { MouseEvent, ReactNode } from "react";
import "./Hint.scss";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import type { IconProps } from "@anori/components/icon/types";
import clsx from "clsx";
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
