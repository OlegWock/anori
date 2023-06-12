import clsx from "clsx";
import { motion } from "framer-motion";
import { ComponentProps } from "react";
import './Alert.scss';

type AlertLevel = "info" | "attention";

export const Alert = ({ className, level = "attention", ...props }: { level?: AlertLevel } & ComponentProps<typeof motion.div>) => {
    return (<motion.div className={clsx("Alert", `Alert-${level}`, className)} {...props} />)
}