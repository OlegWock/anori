import { motion } from 'framer-motion';
import './Modal.scss';
import { ReactNode } from 'react';
import { Icon } from './Icon';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useEffect } from 'react';

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
    useEffect(() => {
        if (!closable || !onClose) return;

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [closable, onClose]);
    
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
                className={clsx("Modal", className)}
                onClick={(e) => e.stopPropagation()}
                layoutId={layoutId}
                initial={{ y: '-100%', }}
                exit={{ y: '-100%', }}
                animate={{ y: 0, }}
                transition={{ duration: 0.2 }}
            >
                <div className="header">
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
        </motion.div>),
        document.body,
    );
}