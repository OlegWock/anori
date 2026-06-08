import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { IconProps } from "@anori/design-system/components/Icon/types";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { clsx } from "clsx";
import type { MouseEvent, ReactNode } from "react";
import { css } from "styled-system/css";

const hint = css({ color: "icon", cursor: "pointer", marginLeft: "3" });

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
        className={clsx(hint, className)}
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
