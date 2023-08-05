import { m, useMotionTemplate, useMotionValue, useTransform, useAnimate, Transition, usePresence } from "framer-motion";
import './WidgetExpandArea.scss';
import { ReactNode, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParentWidgetCardRef } from "./WidgetCard";
import { usePrevious } from "@utils/hooks";
import clsx from "clsx";
import { Icon } from "./Icon";

export type WidgetExpandAreaProps = {
    children: ReactNode,
    size?: 'auto' | 'max',
    className?: string,
    closable?: boolean,
    onClose?: () => void,
};

const BORDER_RADIUS = 24;
const SCREEN_PADDING = 36;

const transition: Transition = {
    type: 'tween',
    ease: 'easeInOut',
};

export const WidgetExpandArea = ({ children, onClose, className, closable = true, size = 'auto' }: WidgetExpandAreaProps) => {
    const playUnmount = () => {
        if (!areaRef.current) {
            console.warn('WidgetExpandArea ref is missing on unmount');
            return;
        }

        if (!cardRef.current) {
            console.error('You should use WidgetExpandArea only inside widge');
            return;
        }

        const cardBox = cardRef.current.getBoundingClientRect();
        const realAreaBox = areaRef.current.getBoundingClientRect();
        const xScale = cardBox.width / realAreaBox.width;
        const yScale = cardBox.height / realAreaBox.height;
        const duration = 0.2;
        console.log('Duration', duration);
        const topEdgeScale = cardBox.top - realAreaBox.top;
        const bottomEdgeScale = (realAreaBox.top + realAreaBox.height) - cardBox.bottom;

        const leftEdgeScale = cardBox.left - realAreaBox.left;
        const rightEdgeScale = (realAreaBox.left + realAreaBox.width) - (cardBox.x + cardBox.width);

        const originX = (leftEdgeScale / (leftEdgeScale + rightEdgeScale)) * realAreaBox.width;
        const originY = (topEdgeScale / (topEdgeScale + bottomEdgeScale)) * realAreaBox.height;
        transformOriginX.jump(originX);
        transformOriginY.jump(originY);


        animate(contentOpacity, 0, { ...transition, duration: duration / 2 })
            .then(() => animate(scaleY, yScale, { ...transition, duration }))
            .then(() => {
                animate(backgroundOpacity, 0, { ...transition, duration });
                return animate(scaleX, xScale, { ...transition, duration })
            })
            .then(() => safeToRemove && safeToRemove());
    };

    const transformOriginX = useMotionValue(50);
    const transformOriginY = useMotionValue(50);
    const transformOriginStr = useMotionTemplate`${transformOriginX}px ${transformOriginY}px`;
    const scaleX = useMotionValue(1);
    const scaleY = useMotionValue(1);
    const positionX = useMotionValue(0);
    const positionY = useMotionValue(0);
    const borderRadiusStr = useTransform<number, string>([scaleX, scaleY], ([sx, sy]) => {
        return `${BORDER_RADIUS / sx}px / ${BORDER_RADIUS / sy}px`;
    });
    const backgroundOpacity = useMotionValue(0.7);
    const backgroundStr = useTransform(backgroundOpacity, (v) => `rgba(0, 0, 0, ${v.toFixed(2)})`);
    const contentOpacity = useMotionValue(1);

    const areaRef = useRef<HTMLDivElement>(null);
    const cardRef = useParentWidgetCardRef();

    const [scope, animate] = useAnimate();
    const [isPresent, safeToRemove] = usePresence();
    const prevIsPresent = usePrevious(isPresent, true);


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
        const cardCenterX = cardBox.left + (cardBox.width / 2);
        const cardCenterY = cardBox.top + (cardBox.height / 2);

        const realAreaBox = areaRef.current.getBoundingClientRect();
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

        backgroundOpacity.jump(0);
        contentOpacity.jump(0);

        animate(scaleX, 1, { ...transition, duration }).then(() => {
            return animate(scaleY, 1, { ...transition, duration });
        }).then(() => {
            return animate(contentOpacity, 1, { ...transition, duration: duration / 2 });
        });
        animate(backgroundOpacity, 0.75, { ...transition, duration });
    }, []);

    if (!isPresent && prevIsPresent) {
        playUnmount();
    }

    return createPortal(
        (<m.div
            className="WidgetExpandArea-backdrop"
            ref={scope}
            onClick={(e) => { e.stopPropagation(); onClose && onClose() }}
            style={{
                backgroundColor: backgroundStr
            }}
        >
            <m.div
                className={clsx("WidgetExpandArea", `size-${size}`)}
                ref={areaRef}
                onClick={e => e.stopPropagation()}
                style={{
                    transformOrigin: transformOriginStr,
                    scaleX: scaleX,
                    scaleY: scaleY,
                    top: positionY,
                    left: positionX,
                    borderRadius: borderRadiusStr,
                }}
            >
                <m.div
                    className={clsx("WidgetExpandArea-content", className)}
                    style={{
                        opacity: contentOpacity
                    }}
                >
                    {closable && <m.button
                        className='close-button'
                        onClick={() => onClose && onClose()}
                        whileHover={{
                            rotate: 180,
                            transition: { duration: 0.2 },
                        }}
                    >
                        <Icon icon='ion:close' width={24} height={24} />
                    </m.button>}
                    {children}
                </m.div>
            </m.div>
        </m.div>),
        document.body
    );
};