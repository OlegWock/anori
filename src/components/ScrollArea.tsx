import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import './ScrollArea.scss';
import { ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import { m } from 'framer-motion';
import { forwardRef } from 'react';

type ScrollAreaProps = {
    children?: ReactNode,
    className?: string,
    contentClassName?: string,
    darker?: boolean,
    type?: RadixScrollArea.ScrollAreaContextValue['type'],
    onlyVertical?: boolean,
} & ComponentProps<typeof m.div>;

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(({ children, className, contentClassName, type = "auto", darker, onlyVertical = true, ...props }, ref) => {
    return (<RadixScrollArea.Root className={clsx("ScrollAreaRoot", className, { 'darker': darker, 'only-vertical': onlyVertical })} asChild type={type} ref={ref}>
        <m.div {...props}>
            <RadixScrollArea.Viewport className={clsx("ScrollAreaViewport", contentClassName)}>
                {children}
            </RadixScrollArea.Viewport>
            <RadixScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="vertical">
                <RadixScrollArea.Thumb className="ScrollAreaThumb" />
            </RadixScrollArea.Scrollbar>
            {(!onlyVertical) && <RadixScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="horizontal">
                <RadixScrollArea.Thumb className="ScrollAreaThumb" />
            </RadixScrollArea.Scrollbar>}
            <RadixScrollArea.Corner className="ScrollAreaCorner" />
        </m.div>
    </RadixScrollArea.Root>)
});

export const MotionScrollArea = m(ScrollArea);