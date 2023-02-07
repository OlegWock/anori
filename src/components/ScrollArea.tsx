import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import './ScrollArea.scss';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type ScrollAreaProps = {
    children?: ReactNode,
    className?: string,
    constentClassName?: string,
    darker?: boolean,
    type?: RadixScrollArea.ScrollAreaContextValue['type'],
    onlyVertical?: boolean,
}

export const ScrollArea = ({ children, className, constentClassName, type = "auto", darker, onlyVertical = true }: ScrollAreaProps) => {
    return (<RadixScrollArea.Root className={clsx("ScrollAreaRoot", className, { 'darker': darker, 'only-vertical': onlyVertical })} type={type}>
        <RadixScrollArea.Viewport className={clsx("ScrollAreaViewport", constentClassName)}>
            {children}
        </RadixScrollArea.Viewport>
        <RadixScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="vertical">
            <RadixScrollArea.Thumb className="ScrollAreaThumb" />
        </RadixScrollArea.Scrollbar>
        <RadixScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="horizontal">
            <RadixScrollArea.Thumb className="ScrollAreaThumb" />
        </RadixScrollArea.Scrollbar>
        <RadixScrollArea.Corner className="ScrollAreaCorner" />
    </RadixScrollArea.Root>)
};

export const MotionScrollArea = motion(ScrollArea);