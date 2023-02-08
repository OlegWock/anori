import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import './ScrollArea.scss';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { forwardRef } from 'react';

type ScrollAreaProps = {
    children?: ReactNode,
    className?: string,
    constentClassName?: string,
    darker?: boolean,
    type?: RadixScrollArea.ScrollAreaContextValue['type'],
    onlyVertical?: boolean,
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(({ children, className, constentClassName, type = "auto", darker, onlyVertical = true }, ref) => {
    return (<RadixScrollArea.Root className={clsx("ScrollAreaRoot", className, { 'darker': darker, 'only-vertical': onlyVertical })} type={type} ref={ref}>
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
});

export const MotionScrollArea = motion(ScrollArea);