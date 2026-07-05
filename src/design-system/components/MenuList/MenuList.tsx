import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useSizeSettings } from "@anori/utils/compact";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { css, cva, cx } from "styled-system/css";
import { styled } from "styled-system/jsx";

export const MenuList = styled("div", {
  base: { display: "flex", flexDirection: "column", gap: "0-5" },
});

const item = cva({
  base: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "3",
    padding: "3",
    border: "none",
    background: "transparent",
    color: "text.primary",
    borderRadius: "md",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "sm",
    transition: "background-color 0.15s ease",
    _hover: { background: "control" },
  },
  variants: {
    active: {
      true: {
        background: "color-mix(in srgb, var(--ds-accent) 22%, transparent)",
        fontWeight: "semibold",
        _hover: { background: "color-mix(in srgb, var(--ds-accent) 22%, transparent)" },
      },
    },
  },
});

const label = css({ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export type MenuItemProps = {
  icon?: string;
  active?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export const MenuItem = ({ icon, active, children, className, ref, ...props }: MenuItemProps) => {
  const { rem } = useSizeSettings();
  return (
    <button ref={ref} type="button" className={cx(item({ active }), className)} {...props}>
      {icon && <Icon icon={icon} width={rem(1.25)} height={rem(1.25)} color="icon" />}
      <span className={label}>{children}</span>
    </button>
  );
};
