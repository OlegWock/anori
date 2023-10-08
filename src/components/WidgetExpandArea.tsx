import { m, useMotionTemplate, useMotionValue, useTransform, useAnimate, Transition, usePresence, PanInfo, MotionValue } from "framer-motion";
import './WidgetExpandArea.scss';
import { MouseEvent, ReactNode, createContext, forwardRef, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParentWidgetCardRef } from "./WidgetCard";
import { useHotkeys, usePrevious } from "@utils/hooks";
import clsx from "clsx";
import { Icon } from "./Icon";
import { ScrollArea } from "./ScrollArea";
import { useSizeSettings } from "@utils/compact";
import { minmax } from "@utils/misc";
import { useDirection } from "@radix-ui/react-direction";

export type WidgetExpandAreaProps = {
    children: ReactNode,
    title: string,
    enableDetach?: boolean,
    size?: 'auto' | 'max' | { width?: number, height?: number },
    className?: string,
    closable?: boolean,
    onClose?: () => void,
    withoutScroll?: boolean,
    extraButtons?: ReactNode,
};

export type WidgetExpandAreaRef = {
    focus: (withAnimation: boolean) => void
};

const BORDER_RADIUS = 24;
const SCREEN_PADDING = 36;

const transition: Transition = {
    type: 'tween',
    ease: 'easeInOut',
};

const WidgetWindowsContext = createContext({
    register: (id: string, mv: MotionValue<number>) => { },
    unregister: (id: string) => { },
    bringToFront: (id: string) => { },
    hasDetachedWindows: () => false as boolean,
});

export const WidgetWindowsProvider = ({ children }: { children: ReactNode }) => {
    const register = (id: string, mv: MotionValue<number>) => {
        console.log('Register', id);
        registeredWindows.current[id] = mv;
        stack.current = [...stack.current, id];
        updateZindexForStack();
    };

    const unregister = (id: string) => {
        console.log('Unregister', id);
        delete registeredWindows.current[id];
        stack.current = stack.current.filter(e => e !== id);
        updateZindexForStack();
    };

    const bringToFront = (id: string) => {
        if (!stack.current.includes(id)) return;
        console.log('bringToFront', id);
        stack.current = [...stack.current.filter(e => e !== id), id];
        updateZindexForStack();
    };

    const updateZindexForStack = () => {
        stack.current.forEach((id, ind) => {
            registeredWindows.current[id]?.jump(minZindex + ind)
        })
    };

    const hasDetachedWindows = () => {
        return stack.current.length !== 0;
    };

    const registeredWindows = useRef<Record<string, MotionValue<number>>>({});
    const stack = useRef<string[]>([]);
    const minZindex = 10;

    return (<WidgetWindowsContext.Provider value={{ register, bringToFront, unregister, hasDetachedWindows }}>
        {children}
    </WidgetWindowsContext.Provider>)
};

export const useWidgetWindows = () => {
    return useContext(WidgetWindowsContext);
};


export const WidgetExpandArea = forwardRef<WidgetExpandAreaRef, WidgetExpandAreaProps>(({ children, onClose, className, enableDetach = true, closable = true, size = 'auto', withoutScroll = false, extraButtons, title }, ref) => {
    const playUnmount = () => {
        if (detached) {
            safeToRemove && safeToRemove();
            return;
        }

        if (!areaRef.current) {
            console.warn('WidgetExpandArea ref is missing on unmount');
            safeToRemove && safeToRemove();
            return;
        }

        if (!cardRef.current) {
            console.error('You should use WidgetExpandArea only inside widge');
            safeToRemove && safeToRemove();
            return;
        }

        const cardBox = cardRef.current.getBoundingClientRect();
        const realAreaBox = areaRef.current.getBoundingClientRect();
        const xScale = cardBox.width / realAreaBox.width;
        const yScale = cardBox.height / realAreaBox.height;
        const duration = 0.2;
        const topEdgeScale = cardBox.top - realAreaBox.top;
        const bottomEdgeScale = (realAreaBox.top + realAreaBox.height) - cardBox.bottom;

        const leftEdgeScale = cardBox.left - realAreaBox.left;
        const rightEdgeScale = (realAreaBox.left + realAreaBox.width) - (cardBox.x + cardBox.width);

        const originX = (leftEdgeScale / (leftEdgeScale + rightEdgeScale)) * realAreaBox.width;
        const originY = (topEdgeScale / (topEdgeScale + bottomEdgeScale)) * realAreaBox.height;
        transformOriginX.jump(originX);
        transformOriginY.jump(originY);

        const bgLighter = getComputedStyle(document.documentElement).getPropertyValue('--background-lighter');

        animate(contentOpacity, 0, { ...transition, duration: duration / 2 })
            .then(() => {
                animate(windowColor, bgLighter, { ...transition, duration });
                return animate(scaleY, yScale, { ...transition, duration });
            })
            .then(() => {
                animate(backdropOpacity, 0, { ...transition, duration });
                return animate(scaleX, xScale, { ...transition, duration })
            })
            .then(() => safeToRemove && safeToRemove());
    };

    const detach = () => {
        if (!areaRef.current) return;
        const box = areaRef.current.getBoundingClientRect();
        width.set(box.width);
        height.set(box.height);
        attachedPosXRef.current = positionX.get();
        attachedPosYRef.current = positionY.get();
        register(id, zIndexMotion);
        setDetached(true);
    };

    const attach = () => {
        positionX.set(attachedPosXRef.current);
        positionY.set(attachedPosYRef.current);
        unregister(id);
        setDetached(false);
    };

    const onPan = (event: PointerEvent, info: PanInfo) => {
        positionX.set(positionXCorrected.get() + info.delta.x);
        positionY.set(positionYCorrected.get() + info.delta.y);
    };

    const onResizeHandler = (side: 'right' | 'left' | 'top' | 'bottom' | 'left-top' | 'right-bottom' | 'left-bottom' | 'right-top') => (event: PointerEvent, info: PanInfo) => {
        if (side.includes('left')) {
            const newWidth = width.get() - info.delta.x;
            if (newWidth > 400) {
                positionX.set(positionX.get() + info.delta.x);
                width.set(newWidth);
            }
        }
        if (side.includes('right')) {
            const newWidth = width.get() + info.delta.x;
            if (newWidth > 400) {
                width.set(newWidth);
            }
        }
        if (side.includes('top')) {
            const newHeight = height.get() - info.delta.y;
            if (newHeight > 200) {
                positionY.set(positionY.get() + info.delta.y);
                height.set(newHeight);
            }
        }
        if (side.includes('bottom')) {
            const newHeight = height.get() + info.delta.y;
            if (newHeight > 200) {
                height.set(newHeight);
            }
        }
    };

    const bringToFrontHandler = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        bringToFront(id);
    };

    const { rem } = useSizeSettings();
    const id = useId();
    const { register, unregister, bringToFront } = useWidgetWindows();
    const [detached, setDetached] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    const positionX = useMotionValue(0);
    const positionY = useMotionValue(0);
    const attachedPosXRef = useRef(0);
    const attachedPosYRef = useRef(0);
    const width = useMotionValue(typeof size === 'object' && size.width ? size.width : 0);
    const height = useMotionValue(typeof size === 'object' && size.height ? size.height : 0);
    const positionXCorrected = useTransform<number, number>(positionX, (x) => {
        if (minimized) {
            return minmax(x, 0, window.innerWidth - 420);
        }
        return minmax(x, 0, window.innerWidth - 100);
    });
    const positionYCorrected = useTransform<number, number>(positionY, (y) => {
        if (minimized) {
            return minmax(y, 0, window.innerHeight - rem(3));
        }
        return minmax(y, 0, window.innerHeight - 100);
    });
    const zIndexMotion = useMotionValue(100);


    const transformOriginX = useMotionValue(50);
    const transformOriginY = useMotionValue(50);
    const transformOriginStr = useMotionTemplate`${transformOriginX}px ${transformOriginY}px`;
    const scaleX = useMotionValue(1);
    const scaleY = useMotionValue(1);
    const borderRadiusStr = useTransform<number, string>([scaleX, scaleY], ([sx, sy]) => {
        return `${BORDER_RADIUS / sx}px / ${BORDER_RADIUS / sy}px`;
    });
    const backdropOpacity = useMotionValue(0.7);
    const backgroundStr = useTransform(backdropOpacity, (v) => `rgba(0, 0, 0, ${v.toFixed(2)})`);
    const contentOpacity = useMotionValue(1);
    const windowColor = useMotionValue('var(--background)');

    const areaRef = useRef<HTMLDivElement>(null);
    const cardRef = useParentWidgetCardRef();

    const [scope, animate] = useAnimate();
    const [isPresent, safeToRemove] = usePresence();
    const prevIsPresent = usePrevious(isPresent, true);
    const dir = useDirection();

    useHotkeys('esc', () => !detached && onClose && onClose());

    useImperativeHandle(ref, () => {
        return {
            focus: (withAnimation) => {
                bringToFront(id);
                if (withAnimation) {
                    const initScaleX = scaleX.get();
                    const initScaleY = scaleY.get();
                    animate([
                        [scaleX, [initScaleX, initScaleX * 1.1, initScaleX], { duration: 0.2 }],
                        [scaleY, [initScaleY, initScaleY * 1.1, initScaleY], { duration: 0.2 }]
                    ]);
                }
            },
        };
    }, [id, bringToFront])

    useLayoutEffect(() => {
        if (!areaRef.current) {
            console.warn('WidgetExpandArea ref is missing in layout effect');
            return;
        }

        if (!cardRef.current) {
            console.error('You should use WidgetExpandArea only inside widge');
            return;
        }

        const cardBox = cardRef.current.getBoundingClientRect();
        const realAreaBox = areaRef.current.getBoundingClientRect();

        const cardCenterX = cardBox.left + (cardBox.width / 2);
        const cardCenterY = cardBox.top + (cardBox.height / 2);

        console.log('Card coordinates', { cardBox, cardCenterX, cardCenterY, realAreaBox });

        let areaCenterX = cardCenterX, areaCenterY = cardCenterY;

        if (areaCenterY - (realAreaBox.height / 2) < SCREEN_PADDING) {
            // Top edge overflows screen
            areaCenterY = SCREEN_PADDING + (realAreaBox.height / 2);
        }
        if (areaCenterY + (realAreaBox.height / 2) > (window.innerHeight - SCREEN_PADDING)) {
            // Bottom edge overflows screen
            areaCenterY = window.innerHeight - SCREEN_PADDING - (realAreaBox.height / 2);
        }
        if (areaCenterX - (realAreaBox.width / 2) < SCREEN_PADDING) {
            // Left edge overflows screen
            areaCenterX = SCREEN_PADDING + (realAreaBox.width / 2);
        }
        if (areaCenterX + (realAreaBox.width / 2) > (window.innerWidth - SCREEN_PADDING)) {
            // Right edge overflows screen
            areaCenterX = window.innerWidth - SCREEN_PADDING - (realAreaBox.width / 2);
        }

        const areaPositionX = areaCenterX - (realAreaBox.width / 2);
        const areaPositionY = areaCenterY - (realAreaBox.height / 2);
        positionX.jump(areaPositionX);
        positionY.jump(areaPositionY);

        const xScale = cardBox.width / realAreaBox.width;
        const yScale = cardBox.height / realAreaBox.height;
        const duration = 0.2;
        scaleX.jump(xScale);
        scaleY.jump(yScale);

        const topEdgeScale = cardBox.top - areaPositionY;
        const bottomEdgeScale = (areaPositionY + realAreaBox.height) - cardBox.bottom;

        const leftEdgeScale = cardBox.left - areaPositionX;
        const rightEdgeScale = (areaPositionX + realAreaBox.width) - (cardBox.x + cardBox.width);

        const originX = (leftEdgeScale / (leftEdgeScale + rightEdgeScale)) * realAreaBox.width;
        const originY = (topEdgeScale / (topEdgeScale + bottomEdgeScale)) * realAreaBox.height;

        transformOriginX.jump(originX);
        transformOriginY.jump(originY);

        backdropOpacity.jump(0);
        contentOpacity.jump(0);
        const bgLighter = getComputedStyle(document.documentElement).getPropertyValue('--background-lighter');
        const bgDarker = getComputedStyle(document.documentElement).getPropertyValue('--background');
        windowColor.jump(bgLighter);

        animate(scaleX, 1, { ...transition, duration }).then(() => {
            animate(windowColor, bgDarker, { ...transition, duration });
            return animate(scaleY, 1, { ...transition, duration });
        }).then(() => {
            return animate(contentOpacity, 1, { ...transition, duration: duration / 2 });
        });
        animate(backdropOpacity, 0.75, { ...transition, duration });
    }, []);

    useEffect(() => {
        return () => {
            if (detached) unregister(id);
        }
    }, [detached]);

    if (!isPresent && prevIsPresent) {
        playUnmount();
    }

    return createPortal(
        (<m.div
            className="WidgetExpandArea-backdrop"
            key='backdrop'
            dir='ltr'
            ref={scope}
            onClick={(e) => { e.stopPropagation(); onClose && onClose() }}
            style={{
                backgroundColor: detached ? 'transparent' : backgroundStr,
                zIndex: detached ? zIndexMotion : 100,
                pointerEvents: detached ? 'none' : 'auto',
            }}
        >
            <m.div
                className={clsx(
                    "WidgetExpandArea",
                    (!detached && typeof size === 'string') && `size-${size}`,
                    (!detached && typeof size === 'object') && `size-predefined`,
                    detached && "detached",
                    enableDetach && "detachable",
                    withoutScroll && "without-inner-padding",
                    minimized && "minimized"
                )}
                dir='ltr'
                ref={areaRef}
                key='area'
                onClick={bringToFrontHandler}
                style={{
                    transformOrigin: detached ? 'center' : transformOriginStr,
                    scaleX: scaleX,
                    scaleY: scaleY,
                    top: positionYCorrected,
                    left: positionXCorrected,
                    // left: dir === 'ltr' ? positionXCorrected : undefined,
                    // right: dir === 'rtl' ? positionXCorrected : undefined,
                    borderRadius: borderRadiusStr,
                    position: detached ? 'fixed' : 'relative',
                    zIndex: zIndexMotion,
                    width: detached ? (minimized ? 420 : width) : typeof size === 'object' && size.width ? width : undefined,
                    height: detached ? (minimized ? 'unset' : height) : typeof size === 'object' && size.height ? height : undefined,
                    boxShadow: detached ? 'rgba(0, 0, 0, 0.44) 0px 3px 8px 4px' : 'rgba(0, 0, 0, 0.24) 0px 3px 8px',
                    backgroundColor: windowColor,
                    pointerEvents: 'auto',
                }}
            >
                {enableDetach && <m.div
                    className="window-control-strip"
                    dir={dir}
                    style={{
                        opacity: contentOpacity
                    }}
                >
                    <m.h3
                        className="window-title"
                        onPanStart={() => {
                            detached && setIsMoving(true);
                            bringToFront(id);
                        }}
                        onPan={(e, i) => detached && onPan(e, i)}
                        onPanEnd={() => detached && setIsMoving(false)}
                        style={{ cursor: detached ? 'grab' : 'default' }}
                    >
                        {title}
                    </m.h3>
                    <m.div className="window-buttons">
                        {extraButtons}
                        {!detached && <m.button
                            onClick={detach}
                        >
                            <Icon icon='ion:albums' width={rem(1.5)} height={rem(1.5)} />
                        </m.button>}
                        {detached && <>
                            <m.button
                                style={{ cursor: 'grab' }}
                                onPanStart={() => {
                                    setIsMoving(true);
                                    bringToFront(id);
                                }}
                                onPan={onPan}
                                onPanEnd={() => setIsMoving(false)}
                            >
                                <Icon icon='fluent:arrow-move-20-filled' width={rem(1.5)} height={rem(1.5)} />
                            </m.button>
                            {!minimized && <m.button
                                onClick={() => setMinimized(true)}
                            >
                                <Icon icon='fluent:arrow-minimize-20-filled' width={rem(1.5)} height={rem(1.5)} />
                            </m.button>}
                            {minimized && <m.button
                                onClick={() => setMinimized(false)}
                            >
                                <Icon icon='fluent:arrow-maximize-20-filled' width={rem(1.5)} height={rem(1.5)} />
                            </m.button>}
                            <m.button
                                onClick={attach}
                            >
                                <Icon icon='fluent:full-screen-maximize-16-filled' width={rem(1.5)} height={rem(1.5)} />
                            </m.button>
                        </>}
                        {closable && <m.button
                            onClick={() => onClose && onClose()}
                            whileHover={{
                                rotate: 180,
                                transition: { duration: 0.2 },
                            }}
                        >
                            <Icon icon='ion:close' width={rem(1.5)} height={rem(1.5)} />
                        </m.button>}
                    </m.div>
                </m.div>}
                {(detached && !minimized) && <>
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('left')} className="resize-handle left" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('right')} className="resize-handle right" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('top')} className="resize-handle top" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('bottom')} className="resize-handle bottom" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('left-top')} className="resize-handle left-top" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('right-bottom')} className="resize-handle right-bottom" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('left-bottom')} className="resize-handle left-bottom" />
                    <m.div onPointerDown={e => e.preventDefault()} onPanStart={() => { setIsResizing(true); bringToFront(id) }} onPanEnd={() => setIsResizing(false)} onPan={onResizeHandler('right-top')} className="resize-handle right-top" />
                </>}
                <m.div
                    className={clsx("WidgetExpandArea-content", className)}
                    style={{
                        opacity: contentOpacity,
                        display: minimized ? 'none' : undefined,
                        pointerEvents: (isResizing || isMoving) ? 'none' : 'auto',
                    }}
                    dir={dir}
                >
                    {(!enableDetach && closable) && <m.button
                        className='close-button'
                        onClick={() => onClose && onClose()}
                        whileHover={{
                            rotate: 180,
                            transition: { duration: 0.2 },
                        }}
                    >
                        <Icon icon='ion:close' width={24} height={24} />
                    </m.button>}

                    {withoutScroll && children}
                    {!withoutScroll && <ScrollArea color="dark" type="hover" direction="both">
                        {children}
                    </ScrollArea>}
                </m.div>
            </m.div>
        </m.div>),
        document.body
    );
});