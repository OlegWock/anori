import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from "react";
import { css, cva, cx } from "styled-system/css";
import { splitCssProps } from "styled-system/jsx";
import type { JsxStyleProps } from "styled-system/types";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const heading = cva({
  base: { margin: 0, fontWeight: "light" },
  variants: {
    // Visual size, decoupled from the semantic `level` (so an <h2> can look like an h1).
    size: {
      "1": { fontSize: "2xl" },
      "2": { fontSize: "xl" },
      "3": { fontSize: "lg" },
      "4": { fontSize: "base" },
      "5": { fontSize: "sm" },
      "6": { fontSize: "xs" },
    },
    singleLine: { true: { lineHeight: "none" } },
  },
});

type HeadingOwnProps = {
  level?: HeadingLevel;
  size?: HeadingLevel;
  singleLine?: boolean;
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLHeadingElement>;
};

export type HeadingProps = HeadingOwnProps &
  JsxStyleProps &
  Omit<ComponentPropsWithoutRef<"h2">, keyof JsxStyleProps | "color">;

// TODO: migrate exisitng h1/h2/etc. to use this component
export const Heading = ({ level = 2, size, singleLine = true, className, children, ref, ...rest }: HeadingProps) => {
  const [cssProps, htmlProps] = splitCssProps(rest);
  const Tag = `h${level}` as ElementType;
  const sizeKey = String(size ?? level) as `${HeadingLevel}`;
  return (
    <Tag ref={ref} className={cx(heading({ size: sizeKey, singleLine }), css(cssProps), className)} {...htmlProps}>
      {children}
    </Tag>
  );
};
