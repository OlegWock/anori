import {
  ButtonContent,
  type ButtonSize,
  type ButtonVariant,
  button,
} from "@anori/design-system/components/Button/Button";
import { Link } from "@anori/design-system/components/Link/Link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "styled-system/css";

export interface LinkButtonProps extends Omit<ComponentProps<typeof Link>, "color"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children?: ReactNode;
  iconStart?: string;
  iconEnd?: string;
}

// A navigation control that looks like a Button but renders the DS Link (a real <a> with the local-url
// handling). Use this instead of a Button for anything that navigates.
export const LinkButton = ({
  variant = "primary",
  size = "normal",
  block = false,
  className,
  children,
  iconStart,
  iconEnd,
  ref,
  ...props
}: LinkButtonProps) => {
  return (
    <Link ref={ref} {...props} className={cx(button({ variant, size, block }), className)}>
      <ButtonContent iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonContent>
    </Link>
  );
};
