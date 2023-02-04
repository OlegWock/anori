import { Component, ComponentProps } from 'react';
import './WidgetCard.scss';
import { motion, useAnimation, useDragControls } from 'framer-motion';
import clsx from 'clsx';
import { useParentFolder } from '@utils/FolderContentContext';
import { Button } from './Button';
import { Icon } from './Icon';
import { ReactNode } from 'react';
import { DEFAULT_CARD_MARGIN } from '@utils/grid';

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

type WidgetCardProps = {
    width: number,
    height: number,
    onRemove?: () => void,
    onEdit?: () => void,
    children?: ReactNode,
} & Omit<ComponentProps<typeof motion.div>, 'children'>;

export const WidgetCard = ({ className, children, onRemove, onEdit, style, width, height, ...props }: WidgetCardProps) => {
    const { isEditing, boxSize } = useParentFolder();
    const dragControls = useDragControls();

    return (<motion.div
        className={clsx(className, 'WidgetCard')}
        transition={{ ease: 'easeInOut', duration: 0.15 }}
        exit={isEditing ? { scale: 0 } : undefined}
        whileHover={isEditing ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        dragControls={dragControls}
        dragListener={false}
        style={{
            width: width * boxSize - DEFAULT_CARD_MARGIN * 2,
            height: height * boxSize - DEFAULT_CARD_MARGIN * 2,
            margin: DEFAULT_CARD_MARGIN,
            ...style,
        }}
        {...props}
    >
        {(isEditing && !!onRemove) && <Button className='remove-widget-btn' onClick={onRemove}>
            <Icon icon='ion:close' width={20} height={20} />
        </Button>}
        {(isEditing && !!onEdit) && <Button className='edit-widget-btn' onClick={onEdit}>
            <Icon icon='ion:pencil' width={20} height={20} />
        </Button>}
        {isEditing && <Button className='drag-widget-btn' onPointerDown={e => dragControls.start(e)}>
            <Icon icon='ic:baseline-drag-indicator' width={20} height={20} />
        </Button>}
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    </motion.div>)
};