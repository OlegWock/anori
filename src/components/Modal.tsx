import { motion, useIsPresent } from 'framer-motion';
import './Modal.scss';
import { ReactNode } from 'react';
import { Icon } from './Icon';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import useMeasure from 'react-use-measure';
import { useHotkeys } from 'react-hotkeys-hook';

export type ModalProps = {
    title: string;
    children: ReactNode;
    headerButton?: ReactNode,
    layoutId?: string,
    closable?: boolean,
    closeOnClickOutside?: boolean,
    onClose?: () => void,
    className?: string,
};

export const Modal = ({ className, children, title, layoutId, closable, onClose, closeOnClickOutside, headerButton }: ModalProps) => {
    useHotkeys('esc', () => {
        if (!closable || !onClose) return;
        onClose();
    });

    const [ref, bounds] = useMeasure();
    const isPresent = useIsPresent();

    console.log('Modal bounds', bounds);
    console.log('Is present', isPresent);

    return createPortal(
        (<motion.div
            className="Modal-backdrop"
            onClick={() => closable && closeOnClickOutside && onClose && onClose()}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: 1, }}
            transition={{ duration: 0.1 }}
        >
            <motion.div
                className='Modal-wrapper'
                initial={{ y: '-100%', }}
                exit={{ y: '-100%', }}
                animate={{
                    y: 0,
                    height: isPresent ? bounds.height : undefined
                }}
                transition={{
                    height: {
                        duration: 0.15,
                    },
                    y: {
                        duration: 0.2,
                    }
                }}
            >
                <motion.div
                    className={clsx("Modal", className)}
                    onClick={(e) => e.stopPropagation()}
                    layoutId={layoutId}
                    ref={ref}
                >
                    <div className="modal-header">
                        {headerButton}
                        <h1>{title}</h1>
                        {closable && <motion.button
                            className='close-button'
                            onClick={() => onClose && onClose()}
                            whileHover={{
                                rotate: 180,
                                transition: { duration: 0.2 },
                            }}
                        >
                            <Icon icon='ion:close' width={24} height={24} />
                        </motion.button>}
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        </motion.div>),
        document.body,
    );
}