import { Icon } from "@anori/components/icon/Icon";
import type { ComponentProps } from "react";
import "./ScreenButton.scss";

export const ScreenButton = ({ icon, name, ...props }: { icon: string; name: string } & ComponentProps<"button">) => {
  return (
    <button className="ScreenButton" {...props}>
      <Icon icon={icon} width={48} height={48} className="icon" />
      <span>{name}</span>
    </button>
  );
};
