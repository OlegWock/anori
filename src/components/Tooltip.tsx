import { cloneElement, useState } from "react";
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
    Strategy
} from "@floating-ui/react-dom-interactions";
import { AnimatePresence, motion } from "framer-motion";
import './Tooltip.scss';

interface Props {
    label: string;
    showDelay?: number;
    resetDelay?: number;
    placement?: Placement;
    strategy?: Strategy;
    maxWidth?: number;
    children: JSX.Element;
}

export const Tooltip = ({ children, label, placement = "bottom", strategy = 'absolute', maxWidth = 0, showDelay = 200, resetDelay = 100 }: Props) => {
    const { delay = showDelay, setCurrentId } = useDelayGroupContext();
    const [open, setOpen] = useState(false);

    const { x, y, reference, floating, strategy: localStrategy, context } = useFloating({
        placement,
        strategy,
        open,
        onOpenChange(open) {
            setOpen(open);

            if (open) {
                setCurrentId(label);
            }
        },
        middleware: [offset(5), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate
    });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        useHover(context, { delay, restMs: resetDelay }),
        useFocus(context),
        useRole(context, { role: "tooltip" }),
        useDismiss(context),
        useDelayGroup(context, { id: label })
    ]);

    const translate = {
        'top': { translateY: 5, },
        'bottom': { translateY: -5, },
        'left': { translateX: 5 },
        'right': { translateX: -5 },
    }[placement.includes('-') ? placement.split('-')[0] : placement];

    return (
        <>
            {cloneElement(
                children,
                getReferenceProps({ ref: reference, ...children.props })
            )}
            <FloatingPortal root={document.body}>
                <AnimatePresence>
                    {open && (
                        <motion.div
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
                                className: "Tooltip",
                                style: {
                                    position: localStrategy,
                                    maxWidth: maxWidth || undefined,
                                    zIndex: 9999999999,
                                    top: y ?? 0,
                                    left: x ?? 0
                                }
                            })}
                        >
                            {label}
                        </motion.div>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};