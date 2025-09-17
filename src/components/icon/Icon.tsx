import { useMemo } from "react";
import "./Icon.scss";
import { CustomIcon } from "@anori/components/icon/CustomIcon";
import { SvgIcon } from "@anori/components/icon/SvgIcon";
import type { IconProps } from "@anori/components/icon/types";

export const Icon = ({ cache = true, ...props }: IconProps) => {
  const [family, iconName] = useMemo(() => props.icon.split(":"), [props.icon]);

  if (family === "custom") {
    return <CustomIcon {...props} icon={iconName} cache={cache} />;
  }

  return <SvgIcon {...props} cache={cache} />;
};
