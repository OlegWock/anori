import classNames from "clsx";
import React from "react";
import './Button.scss';

type ButtonSize = "normal" | "compact";

interface ButtonProps extends Omit<React.ComponentProps<"button">, "type"> {
    size?: ButtonSize,
    block?: boolean,
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ size = "normal", block = false,  ...props}, ref) => {
    return <button {...props} ref={ref} className={classNames('Button', {
        [`Button-normal`]: true, 
        [`Button-size-${size}`]: true,
        [`Button-block`]: block,
    }, props.className)}/>
});

export const LinkButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>((props, ref) => {
    return <button {...props} ref={ref} className={classNames('LinkButton', props.className)}/>
});