import classNames from "clsx";
import { type ComponentProps, type ReactNode, forwardRef } from "react";
import "./Button.scss";
import { m } from "framer-motion";

type ButtonSize = "normal" | "compact";

export interface ButtonProps extends Omit<ComponentProps<typeof m.button>, "type" | "children"> {
  size?: ButtonSize;
  block?: boolean;
  withoutBorder?: boolean;
  active?: boolean;
  visuallyDisabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

const Spinner = () => <span className="Button-spinner" />;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      size = "normal",
      disabled,
      visuallyDisabled,
      withoutBorder = false,
      active,
      block = false,
      loading = false,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <m.button
        {...props}
        ref={ref}
        disabled={visuallyDisabled ? undefined : isDisabled}
        aria-disabled={visuallyDisabled ? "true" : undefined}
        onClick={visuallyDisabled || loading ? undefined : onClick}
        className={classNames(
          "Button",
          {
            "Button-normal": true,
            [`Button-size-${size}`]: true,
            "Button-block": block,
            "Button-loading": loading,
            "with-border": !withoutBorder,
            active: active,
          },
          props.className,
        )}
      >
        {loading && <Spinner />}
        <span className={classNames("Button-content", { "Button-content-hidden": loading })}>{children}</span>
      </m.button>
    );
  },
);
