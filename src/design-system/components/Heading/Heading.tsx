import { type ComponentPropsWithoutRef, type ElementType, forwardRef, type ReactNode, type Ref } from "react";
import { css, cva, cx } from "styled-system/css";
import { splitCssProps } from "styled-system/jsx";
import type { JsxStyleProps } from "styled-system/types";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const heading = cva({
  base: { margin: 0, fontWeight: "light" },
  variants: {
    // Visual size. Mirrors the global h1–h6 type scale; decoupled from the semantic `level` so a
    // heading can be e.g. an <h2> that looks like an h1.
    size: {
      "1": { fontSize: "2xl" },
      "2": { fontSize: "xl" },
      "3": { fontSize: "lg" },
      "4": { fontSize: "base" },
      "5": { fontSize: "sm" },
      "6": { fontSize: "xs" },
    },
    // Trim the heading's box to its cap-height/alphabetic edges so it hugs the glyphs — lets it align
    // cleanly when vertically centered next to controls. Progressive enhancement (ignored where
    // text-box isn't supported).
    singleLine: { true: { lineHeight: "1" } },
  },
});

type HeadingOwnProps = {
  // Semantic heading level → the rendered tag (h1…h6).
  level?: HeadingLevel;
  // Visual size; defaults to `level`. Use to decouple appearance from semantics.
  size?: HeadingLevel;
  singleLine?: boolean;
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLHeadingElement>;
};

// Panda style props + native heading attrs (Panda owns the overlapping keys, like Icon's split).
export type HeadingProps = HeadingOwnProps &
  JsxStyleProps &
  Omit<ComponentPropsWithoutRef<"h2">, keyof JsxStyleProps | "color">;

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 2, size, singleLine = true, className, children, ...rest },
  ref,
) {
  const [cssProps, htmlProps] = splitCssProps(rest);
  const Tag = `h${level}` as ElementType;
  const sizeKey = String(size ?? level) as `${HeadingLevel}`;
  return (
    <Tag ref={ref} className={cx(heading({ size: sizeKey, singleLine }), css(cssProps), className)} {...htmlProps}>
      {children}
    </Tag>
  );
});
