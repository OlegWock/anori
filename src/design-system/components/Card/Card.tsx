import { type RadiusToken, radiusVar, type SpacingToken, spacingVar } from "@anori/design-system/tokens";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";
import "./Card.scss";

type CardOwnProps<E extends ElementType> = {
  /** Element to render as. Defaults to `div`. */
  as?: E;
  padding?: SpacingToken;
  radius?: RadiusToken;
  className?: string;
  style?: CSSProperties;
};

export type CardProps<E extends ElementType> = CardOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof CardOwnProps<E>>;

export function Card<E extends ElementType = "div">({
  as,
  padding = "5",
  radius = "lg",
  className,
  style,
  ...rest
}: CardProps<E>) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      className={clsx("Card", className)}
      style={{ "--card-padding": spacingVar(padding), "--card-radius": radiusVar(radius), ...style } as CSSProperties}
      {...rest}
    />
  );
}
