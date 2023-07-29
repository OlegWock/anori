import React, { MutableRefObject, cloneElement, useMemo, useState } from "react";
import {
    Placement,
    offset,
    flip,
    shift,
    autoUpdate,
    useFloating,
    useInteractions,
    useRole,
    useDismiss,
    useId,
    useClick,
    FloatingFocusManager,
    FloatingPortal,
    useHover,
    safePolygon,
    Side,
    size
} from "@floating-ui/react";
import { mergeRefs } from "react-merge-refs";
import { m, AnimatePresence } from "framer-motion"
import "./Popover.scss";
import classNames from "clsx";

export type PopoverProps<D = undefined> = {
    component: (data: PopoverRenderProps<D>) => JSX.Element;
    trigger?: 'click' | 'hover';
    placement?: Placement;
    className?: string;
    style?: React.CSSProperties;
    children: JSX.Element;
    onStateChange?: (open: boolean) => void,
    initialFocus?: number | MutableRefObject<HTMLElement | null>;
} & (D extends undefined ? { additionalData?: D } : { additionalData: D });

export type PopoverRenderProps<D = undefined> = {
    close: () => void;
    labelId: string;
    descriptionId: string;
    data: D,
}

export const Popover = <D = undefined>({
    children, component: ContentComponent, placement = 'top', additionalData = undefined,
    className, style = {}, onStateChange, trigger = 'click', initialFocus = 0
}: PopoverProps<D>) => {
    const [open, setOpen] = useState(false);

    const { x, y, reference, floating, strategy, context, placement: computedPlacement } = useFloating({
        open,
        onOpenChange: (open: boolean) => {
            setOpen(open);
            if (onStateChange) onStateChange(open);
        },
        middleware: [
            offset(5),
            size({
                apply({ availableWidth, availableHeight, elements }) {
                    console.log('Size middleware call', { availableHeight, availableWidth })
                    Object.assign(elements.floating.style, {
                        // maxWidth: `${Math.min(Math.max(availableWidth, 0), 632)}px`,
                        maxWidth: `632px`
                    });
                },
                padding: 5
            }),
            flip(),
            shift({
                padding: 5,
                crossAxis: true,
            }),
        ],
        placement,
        whileElementsMounted: autoUpdate
    });

    const id = useId();
    const labelId = `${id}-label`;
    const descriptionId = `${id}-description`;

    const { getReferenceProps, getFloatingProps } = useInteractions([
        useClick(context, {
            enabled: trigger === 'click'
        }),
        useHover(context, {
            enabled: trigger === 'hover',
            delay: 0,
            restMs: 0,
            handleClose: safePolygon()
        }),
        useRole(context),
        useDismiss(context)
    ]);

    // Preserve the consumer's ref
    const ref = useMemo(() => mergeRefs([reference, (children as any).ref]), [
        reference,
        children
    ]);


    const OFFSET = 5;

    const side = computedPlacement.split('-')[0] as Side;
    const initialXY = {
        'top': { x: 0, y: OFFSET },
        'bottom': { x: 0, y: -OFFSET },
        'left': { x: OFFSET, y: 0 },
        'right': { x: -OFFSET, y: 0 },
    }[side];

    return (
        <>
            {cloneElement(children, getReferenceProps({ ref, ...children.props }))}
            <FloatingPortal>
                <AnimatePresence>
                    {open && (
                        <FloatingFocusManager initialFocus={initialFocus} context={context} key="popover">
                            <m.div
                                ref={floating}
                                className={classNames(["Popover", className])}
                                style={{
                                    ...style,
                                    position: strategy,
                                    top: y ?? 0,
                                    left: x ?? 0,
                                }}
                                aria-labelledby={labelId}
                                aria-describedby={descriptionId}
                                initial={{ opacity: 0, ...initialXY }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                exit={{ opacity: 0, ...initialXY }}
                                transition={{ duration: 0.2 }}
                                {...getFloatingProps()}
                            >
                                <ContentComponent
                                    labelId={labelId}
                                    descriptionId={descriptionId}
                                    // @ts-ignore Additional data typing is kind ad-hoc, couldn't figure out better way to do it
                                    data={additionalData}
                                    close={() => {
                                        setOpen(false);
                                        if (onStateChange) onStateChange(false);
                                    }}
                                />
                            </m.div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};
