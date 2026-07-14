import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cva, cx } from "styled-system/css";

const listItem = cva({
  base: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "4",
    minHeight: "2.25rem",
    paddingInline: "1-5",
    paddingBlock: "1",
    borderRadius: "md",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: "text.primary",
    textAlign: "left",
    textDecoration: "none",
    fontFamily: "inherit",
    fontSize: "sm",
    "& svg": { minWidth: "18px", maxWidth: "18px" },
    "@media (any-hover: hover)": { "&:hover": { background: "ghost.hover" } },
  },
});

export const ListItem = <T extends ElementType = "div">({
  as,
  className,
  ...props
}: { as?: T } & ComponentPropsWithoutRef<T>) => {
  const Component = (as ?? "div") as ElementType;
  return <Component className={cx(listItem(), className)} {...props} />;
};
