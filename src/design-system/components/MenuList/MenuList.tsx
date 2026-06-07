import { Icon } from "@anori/design-system/components/Icon/Icon";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
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
        // Keep the active tint even on hover (don't fall back to the plain hover fill).
        _hover: { background: "color-mix(in srgb, var(--ds-accent) 22%, transparent)" },
      },
    },
  },
});

const label = css({ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export type MenuItemProps = {
  // Optional leading icon (name).
  icon?: string;
  active?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { icon, active, children, className, ...props },
  ref,
) {
  return (
    <button ref={ref} type="button" className={cx(item({ active }), className)} {...props}>
      {icon && <Icon icon={icon} width={20} height={20} />}
      <span className={label}>{children}</span>
    </button>
  );
});
