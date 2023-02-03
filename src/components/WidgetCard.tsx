import { Component, ComponentProps } from 'react';
import './WidgetCard.scss';
import { motion, useAnimation } from 'framer-motion';
import clsx from 'clsx';
import { useParentFolder } from '@utils/FolderContentContext';
import { Button } from './Button';
import { Icon } from './Icon';
import { ReactNode } from 'react';

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
    onRemove?: () => void,
    children?: ReactNode,
} & Omit<ComponentProps<typeof motion.div>, 'children'>;

export const WidgetCard = ({ className, children, onRemove, ...props }: WidgetCardProps) => {
    const { isEditing } = useParentFolder();

    return (<motion.div
        className={clsx(className, 'WidgetCard')}
        transition={{ ease: 'easeInOut', duration: 0.15 }}
        whileHover={{ scale: isEditing ? 1.02 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        {...props}
    >
        {(isEditing && !!onRemove) && <Button className='remove-widget-btn' onClick={onRemove}>
            <Icon icon='ion:close' width={20} height={20} />
        </Button>}
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    </motion.div>)
};