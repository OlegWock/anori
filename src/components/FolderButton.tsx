import clsx from "clsx";
import { ComponentProps } from "react";
import { m } from 'framer-motion';
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import './FolderButton.scss';


export type FolderButtonProps = {
    name: string,
    icon: string,
    active?: boolean,
    withRedDot?: boolean,
} & ComponentProps<typeof m.button>;



export const FolderButton = ({ name, active, icon, className, withRedDot, ...props }: FolderButtonProps) => {
    return (<Tooltip label={name} placement="right">
        <m.button className={clsx("FolderButton", className, {
            "active": active,
        })} {...props}>
            {active && <m.div className="background-glow" layoutId="FolderButton-glow" transition={{ duration: 0.2, type: "spring" }} />}
            {withRedDot && <m.div className="red-dot"></m.div>}
            <Icon icon={icon} width={24} height={24} />
        </m.button>
    </Tooltip>)
};