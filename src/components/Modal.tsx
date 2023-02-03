import { motion } from 'framer-motion';
import './Modal.scss';
import { ReactNode } from 'react';
import { Icon } from './Icon';

export type ModalProps = {
    title: string;
    children: ReactNode;
    layoutId?: string,
    closable?: boolean,
    closeOnClickOutside?: boolean,
    onClose?: () => void,
};

export const Modal = ({ children, title, layoutId, closable, onClose, closeOnClickOutside }: ModalProps) => {
    return (
        <motion.div
            className="Modal-backdrop"
            onClick={() => closable && closeOnClickOutside && onClose && onClose()}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: 1, }}
            transition={{ duration: 0.1 }}
        >
            <motion.div
                className="Modal"
                onClick={(e) => e.stopPropagation()}
                layoutId={layoutId}
                initial={{ y: '-100%', }}
                exit={{ y: '-100%', }}
                animate={{ y: 0, }}
                transition={{ duration: 0.2 }}
            >
                <div className="header">
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
    )
}