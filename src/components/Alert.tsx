import clsx from "clsx";
import { m } from "framer-motion";
import { ComponentProps } from "react";
import './Alert.scss';

type AlertLevel = "info-darker" | "info" | "attention";

export const Alert = ({ className, level = "attention", ...props }: { level?: AlertLevel } & ComponentProps<typeof m.div>) => {
    return (<m.div className={clsx("Alert", `Alert-${level}`, className)} {...props} />)
}