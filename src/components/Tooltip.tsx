import { ReactNode, Ref, cloneElement, useId, useState } from "react";
import {
    Placement,
    offset,
    flip,
    shift,
    autoUpdate,
    useFloating,
    useInteractions,
    useHover,
    useFocus,
    useRole,
    useDismiss,
    useDelayGroupContext,
    useDelayGroup,
    FloatingPortal,
    Strategy,
    safePolygon,
    useClick,
} from "@floating-ui/react";
import { AnimatePresence, m } from "framer-motion";
import './Tooltip.scss';
import { mergeRefs } from "react-merge-refs";
import clsx from "clsx";
import { IS_TOUCH_DEVICE } from "@utils/device";

interface Props {
    label: ReactNode | (() => ReactNode);
    showDelay?: number;
    resetDelay?: number;
    placement?: Placement;
    strategy?: Strategy;
    maxWidth?: number;
    children: JSX.Element;
    targetRef?: Ref<HTMLElement>
    hasClickableContent?: boolean,
    ignoreFocus?: boolean,
    enableOnTouch?: boolean,
}

export const Tooltip = ({
    children, label, placement = "bottom", strategy = 'absolute', maxWidth = 0, showDelay = 200, resetDelay = 100, 
    targetRef, hasClickableContent = false, ignoreFocus = false, enableOnTouch = false, 
}: Props) => {
    const { delay = showDelay, setCurrentId } = useDelayGroupContext();
    const [open, setOpen] = useState(false);
    const id = useId();

    const { x, y, reference, floating, strategy: localStrategy, context } = useFloating({
        placement,
        strategy,
        open,
        onOpenChange(open) {
            setOpen(open);

            if (open) {
                setCurrentId(id);
            }
        },
        middleware: [offset(5), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate
    });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        useHover(context, {
            handleClose: hasClickableContent ? safePolygon() : undefined,
            mouseOnly: true,
            delay: typeof delay === 'object' ? delay : {
                open: showDelay,
                close: resetDelay,
            },
        }),
        useClick(context, {
            enabled: IS_TOUCH_DEVICE && enableOnTouch,
            ignoreMouse: true,
            toggle: false,
        }),
        useFocus(context, {
            enabled: !ignoreFocus,
        }),
        useRole(context, { role: "tooltip" }),
        useDismiss(context),
        useDelayGroup(context, { id })
    ]);

    const translate = {
        'top': { translateY: 5, },
        'bottom': { translateY: -5, },
        'left': { translateX: 5 },
        'right': { translateX: -5 },
    }[placement.includes('-') ? placement.split('-')[0] : placement];

    const refs: Ref<any>[] = [reference];
    if (targetRef) refs.push(targetRef);
    const mergedRef = mergeRefs(refs);
    const content = typeof label === 'function' ? label() : label;

    return (
        <>
            {cloneElement(
                children,
                getReferenceProps({ ref: mergedRef, ...children.props })
            )}
            <FloatingPortal root={document.body}>
                <AnimatePresence>
                    {open && (
                        <m.div
                            initial={{ opacity: 0, ...translate }}
                            animate={{ opacity: 1, translateX: 0, translateY: 0 }}
                            exit={{ opacity: 0, ...translate }}
                            transition={
                                // When in "grouped phase", make the transition faster
                                typeof delay === "object" && delay.open === 1
                                    ? { duration: 0.1 }
                                    : { type: "spring", damping: 20, stiffness: 300 }
                            }
                            {...getFloatingProps({
                                ref: floating,
                                className: clsx("Tooltip", hasClickableContent && "has-clickable-content"),
                                style: {
                                    position: localStrategy,
                                    maxWidth: maxWidth || undefined,
                                    zIndex: 9999999999,
                                    top: y ?? 0,
                                    left: x ?? 0
                                }
                            })}
                        >
                            {content}
                        </m.div>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};