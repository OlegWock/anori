import classNames from "clsx";
import React from "react";
import './Button.scss';
import { m } from "framer-motion";

type ButtonSize = "normal" | "compact";

export interface ButtonProps extends Omit<React.ComponentProps<typeof m.button>, "type"> {
    size?: ButtonSize,
    block?: boolean,
    withoutBorder?: boolean,
    active?: boolean,
    visuallyDisabled?: boolean,
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ size = "normal", disabled, visuallyDisabled, withoutBorder = false, active, block = false, onClick, ...props }, ref) => {
    return <m.button
        {...props}
        ref={ref}
        disabled={visuallyDisabled ? undefined : disabled}
        aria-disabled={visuallyDisabled ? 'true' : undefined}
        onClick={visuallyDisabled ? undefined : onClick}
        className={classNames('Button', {
            [`Button-normal`]: true,
            [`Button-size-${size}`]: true,
            [`Button-block`]: block,
            'with-border': !withoutBorder,
            'active': active,
        }, props.className)}
    />
});

export const LinkButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>((props, ref) => {
    return <button {...props} ref={ref} className={classNames('LinkButton', props.className)} />
});