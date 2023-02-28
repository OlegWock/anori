import clsx from "clsx";
import { ComponentProps } from "react";
import { motion } from 'framer-motion';
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import './FolderButton.scss';


export type FolderButtonProps = {
    name: string,
    icon: string,
    active?: boolean,
    withRedDot?: boolean,
} & ComponentProps<typeof motion.button>;



export const FolderButton = ({ name, active, icon, className, withRedDot, ...props }: FolderButtonProps) => {
    return (<Tooltip label={name} placement="right">
        <motion.button className={clsx("FolderButton", className, {
            "active": active,
        })} {...props}>
            {active && <motion.div className="background-glow" layoutId="FolderButton-glow" transition={{ duration: 0.2, type: "spring" }} />}
            {withRedDot && <motion.div className="red-dot"></motion.div>}
            <Icon icon={icon} width={24} />
        </motion.button>
    </Tooltip>)
};