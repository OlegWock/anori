import clsx from "clsx";
import { ComponentProps, useState } from "react";
import { m } from 'framer-motion';
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import './FolderButton.scss';
import { DropDestination } from "./DropDestination";
import { useCurrentlyDragging } from "@utils/drag-and-drop";


export type FolderButtonProps = {
    name: string,
    icon: string,
    active?: boolean,
    withRedDot?: boolean,
    sidebarOrientation: 'vertical' | 'horizontal',
    dropDestination?: {
        id: string,
    },
} & ComponentProps<typeof m.button>;



export const FolderButton = ({ name, active, icon, className, withRedDot, sidebarOrientation, dropDestination, ...props }: FolderButtonProps) => {
    const currentlyDraggingWidget = useCurrentlyDragging({ type: "widget" });
    const [highlightDrop, setHighlightDrop] = useState(false);

    const content = (<m.button className={clsx("FolderButton", className, {
        "active": active,
        "drop-destination": currentlyDraggingWidget && !!dropDestination,
        "highlight-drop": highlightDrop,
    })} {...props}>
        {active && <m.div className="background-glow" layoutId="FolderButton-glow" transition={{ duration: 0.2, type: "spring" }} />}
        {withRedDot && <m.div className="red-dot"></m.div>}
        <Icon icon={icon} width={24} height={24} />
    </m.button>);

    if (dropDestination) {
        return (<Tooltip label={name} placement={sidebarOrientation === "vertical" ? "right" : "top"}>
            <DropDestination
                type="folder"
                id={dropDestination.id}
                filter="widget"
                onDragEnter={(i) => setHighlightDrop(true)}
                onDragLeave={(i) => setHighlightDrop(false)}
            >
                {content}
            </DropDestination>
        </Tooltip>)
    }

    return (<Tooltip label={name} placement={sidebarOrientation === "vertical" ? "right" : "top"}>
        {content}
    </Tooltip>)
};