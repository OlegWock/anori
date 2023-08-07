import { Component, ComponentProps, createContext, createRef, useContext, useLayoutEffect, useRef } from 'react';
import './WidgetCard.scss';
import { PanInfo, m, useMotionValue, useTransform } from 'framer-motion';
import clsx from 'clsx';
import { useParentFolder } from '@utils/FolderContentContext';
import { Button } from './Button';
import { Icon } from './Icon';
import { ReactNode } from 'react';
import { useSizeSettings } from '@utils/compact';
import { DndItemMeta, useDraggable } from '@utils/drag-and-drop';
import { minmax } from '@utils/misc';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error('Error happened inside widget');
        console.error(error);
    }

    render() {
        if (this.state.hasError) {
            return (<>
                <h2>Oops</h2>
                <div className='error-description'>Widget failed to render, check console for details.</div>
            </>);
        }

        return this.props.children;
    }
}

const WidgetCardContext = createContext({
    cardRef: createRef<HTMLDivElement>(),
});

type WidgetCardProps = {
    width: number,
    height: number,
    withAnimation: boolean,
    withPadding: boolean,
    resizable?: false | {
        min: { width: number, height: number },
        max: { width: number, height: number },
    },
    drag?: boolean,
    instanceId?: string,
    onRemove?: () => void,
    onEdit?: () => void,
    onResize?: (newWidth: number, newHeight: number) => boolean | undefined,
    children?: ReactNode,
    onDragEnd?: (foundDestination: DndItemMeta | null, e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => void,
} & Omit<ComponentProps<typeof m.div>, 'children' | 'onDragEnd' | 'onResize'>;

export const WidgetCard = ({
    className, children, onRemove, onEdit, style, width, height, withAnimation, onDragEnd, drag, instanceId,
    withPadding, resizable = false, onResize, ...props
}: WidgetCardProps) => {
    const startResize = () => {
        isResizing.set(true);
    };

    const updateResize = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!resizable) return;
        const newWidth = minmax((width * boxSize - gapSize * 2) + info.offset.x, resizable.min.width, resizable.max.width);
        const newHeight = minmax((height * boxSize - gapSize * 2) + info.offset.y, resizable.min.height, resizable.max.height);
        resizeWidth.set(newWidth);
        resizeHeight.set(newHeight);
    };

    const finishResize = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        isResizing.set(false);
        let shouldReset = true;
        if (onResize) {
            shouldReset = !onResize(
                resizeWidth.get(),
                resizeHeight.get()
            );
        }
        if (shouldReset) {
            resizeWidth.set(width * boxSize - gapSize * 2);
            resizeHeight.set(height * boxSize - gapSize * 2);
        }
    };

    const { isEditing, boxSize } = useParentFolder();
    const { dragControls, elementProps, dragHandleProps } = useDraggable({
        type: 'widget',
        id: instanceId || '',
    }, {
        onDragEnd,
        whileDrag: { zIndex: 9, boxShadow: '0px 4px 4px 3px rgba(0,0,0,0.4)' }
    });
    const { gapSize, rem } = useSizeSettings();
    const ref = useRef<HTMLDivElement>(null);

    const dragProps = drag ? {
        drag,
        dragSnapToOrigin: true,
        dragElastic: 0,
        ...elementProps,
    } : {};

    const resizeWidth = useMotionValue(width * boxSize - gapSize * 2);
    const resizeHeight = useMotionValue(height * boxSize - gapSize * 2);
    const isResizing = useMotionValue(false);

    const boxShadowMotion = useTransform(isResizing, (r) => r ? '0px 4px 4px 3px rgba(0,0,0,0.4)' : '0px 0px 0px 0px rgba(0,0,0,0.0)');
    const zIndexMotion = useTransform(isResizing, (r) => r ? 9 : 0);

    useLayoutEffect(() => {
        resizeWidth.set(width * boxSize - gapSize * 2);
        resizeHeight.set(height * boxSize - gapSize * 2);
        isResizing.set(false);
    }, [width, height, boxSize, gapSize]);

    return (<WidgetCardContext.Provider value={{ cardRef: ref }}>
        <m.div
            id={instanceId ? `WidgetCard-${instanceId}` : undefined}
            ref={ref}
            className={clsx(className, 'WidgetCard', withPadding && 'with-padding')}
            transition={{ ease: 'easeInOut', duration: 0.15 }}
            exit={isEditing ? { scale: 0 } : undefined}
            whileHover={withAnimation ? {
                scale: isEditing ? undefined : 1.05,
            } : undefined}
            whileTap={withAnimation ? {
                scale: isEditing ? undefined : 0.95
            } : undefined}
            style={{
                width: resizeWidth,
                height: resizeHeight,
                margin: gapSize,
                boxShadow: boxShadowMotion,
                zIndex: zIndexMotion,
                ...style,
            }}
            {...dragProps}
            {...props}
        >
            {(isEditing && !!onDragEnd) && <Button className='drag-widget-btn' onPointerDown={e => dragControls.start(e)} withoutBorder {...dragHandleProps}>
                <Icon icon='ic:baseline-drag-indicator' width={rem(1.25)} height={rem(1.25)} />
            </Button>}
            {(isEditing && !!onRemove) && <Button className='remove-widget-btn' onClick={onRemove} withoutBorder>
                <Icon icon='ion:close' width={rem(1.25)} height={rem(1.25)} />
            </Button>}
            {(isEditing && !!onEdit) && <Button className='edit-widget-btn' onClick={onEdit} withoutBorder>
                <Icon icon='ion:pencil' width={rem(1.25)} height={rem(1.25)} />
            </Button>}
            {(isEditing && !!resizable) && <m.div
                className='resize-handle'
                onPointerDown={e => e.preventDefault()}
                onPanStart={startResize}
                onPan={updateResize}
                onPanEnd={finishResize}
            >
                <Icon icon='ion:resize' width={rem(1.25)} height={rem(1.25)} style={{ rotate: 90 }} />
            </m.div>}
            <ErrorBoundary>
                <div className='overflow-protection'>
                    {children}
                </div>
            </ErrorBoundary>
        </m.div>
    </WidgetCardContext.Provider>);
};

export const useParentWidgetCardRef = () => {
    return useContext(WidgetCardContext).cardRef;
};