import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import type { Mapping } from "@anori/utils/types";
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ElementType,
  PropsWithChildren,
  ReactElement,
} from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { mergeRefs } from "react-merge-refs";

type PolymorphicRef<C extends ElementType> = ComponentPropsWithRef<C>["ref"];

type AsProp<C extends ElementType> = {
  as?: C;
};

type PropsToOmit<C extends ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProp<C extends ElementType, Props = Mapping> = PropsWithChildren<Props & AsProp<C>> &
  Omit<ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

type PolymorphicComponentPropWithRef<C extends ElementType, Props = Mapping> = PolymorphicComponentProp<C, Props> & {
  ref?: PolymorphicRef<C>;
};

type ClampTextToFitProps<C extends ElementType> = PolymorphicComponentPropWithRef<
  C,
  { text: string; withTooltip?: boolean; className?: string }
>;

type ClampTextToFitComponent = <C extends ElementType = "span">(props: ClampTextToFitProps<C>) => ReactElement | null;

export const ClampTextToFit: ClampTextToFitComponent = <C extends ElementType = "span">({
  as,
  text,
  withTooltip = false,
  className,
  ref,
  ...props
}: ClampTextToFitProps<C>) => {
  const Component = as || "span";
  const myRef = useRef<HTMLElement>(null);
  const [clamped, setClamped] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the text changes; resizes are handled by the observer
  useLayoutEffect(() => {
    const el = myRef.current;
    if (!el) return;
    // Vertical -webkit-box so we can clamp to a line count and get a native ellipsis.
    el.style.setProperty("display", "-webkit-box");
    el.style.setProperty("-webkit-box-orient", "vertical");
    el.style.overflow = "hidden";

    const measure = () => {
      // Drop the clamp + cap to read the full/natural metrics, then set it to however many lines fit.
      el.style.setProperty("-webkit-line-clamp", "unset");
      el.style.maxHeight = "none";
      const styles = getComputedStyle(el);
      const fontSize = Number.parseFloat(styles.fontSize) || 16;
      let lineHeight = Number.parseFloat(styles.lineHeight);
      // getComputedStyle usually gives px; fall back for "normal" and the unitless-multiplier case.
      if (Number.isNaN(lineHeight)) lineHeight = fontSize * 1.2;
      else if (lineHeight < fontSize) lineHeight *= fontSize;
      const overflows = el.scrollHeight - el.clientHeight > 1;
      const lines = Math.max(1, Math.floor(el.clientHeight / lineHeight));
      el.style.setProperty("-webkit-line-clamp", String(lines));
      // Cap the box to an exact number of lines so no partial extra line peeks below the clamp.
      el.style.maxHeight = `${lines * lineHeight}px`;
      setClamped(overflows);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const content = (
    <Component ref={mergeRefs([ref, myRef])} className={className} {...props}>
      {text}
    </Component>
  );

  // Always render the wrapper (Tooltip adds no DOM node) and just toggle `disabled`, so the element
  // isn't remounted when clamping toggles — otherwise the imperatively-applied styles are lost.
  if (withTooltip) {
    return (
      <Tooltip label={text} showDelay={1500} placement="top" targetRef={myRef} disabled={!clamped}>
        {content}
      </Tooltip>
    );
  }
  return content;
};
