import { AnimatePresence, motion } from 'framer-motion';
import './FolderContent.scss';
import { Folder, homeFolder } from '@utils/user-data/types';
import { Icon } from '@components/Icon';
import clsx from 'clsx';
import { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@components/Button';
import { Modal } from '@components/Modal';
import { NewWidgetWizard } from './NewWidgetWizard';
import { useFolderWidgets } from '@utils/user-data/hooks';
import { WidgetCard } from '@components/WidgetCard';
import { FolderContentContext } from '@utils/FolderContentContext';

type FolderContentProps = {
    folder: Folder,
    animationDirection: 'up' | 'down',
};

const variants = {
    visible: {
        translateY: '0%',
        opacity: 1,
    },
    initial: (custom: 'up' | 'down') => {
        if (custom === 'up') {
            return {
                translateY: '-35%',
                opacity: 0,
            };
        } else {
            return {
                translateY: '35%',
                opacity: 0,
            };
        }
    },
    exit: (custom: 'up' | 'down') => {
        if (custom === 'up') {
            return {
                translateY: '35%',
                opacity: 0,
            };
        } else {
            return {
                translateY: '-35%',
                opacity: 0,
            };
        }
    }
}

const actionButtonAnimations = {
    transition: {
        ease: 'linear',
        duration: 0.1,
    },
    initial: {
        translateY: '-50%',
        opacity: 0,
    },
    animate: {
        translateY: 0,
        opacity: 1,
    },
    exit: {
        translateY: '50%',
        opacity: 0,
    },
};

export const FolderContent = ({ folder, animationDirection }: FolderContentProps) => {
    const { widgets, removeWidget } = useFolderWidgets(folder);
    const [isEditing, setIsEditing] = useState(false);
    const [newWidgetWizardVisible, setNewWidgetWizardVisible] = useState(false);

    useEffect(() => {
        setIsEditing(false);
    }, [folder.id]);

    return (
        <>
            <motion.div
                key={`FolderContent-${folder.id}`}
                className="FolderContent"
                transition={{
                    duration: 0.2,
                    type: 'spring',
                }}
                variants={variants}
                initial="initial"
                animate="visible"
                exit="exit"
                custom={animationDirection}
            >
                <header>
                    <h1>{folder.name}</h1>

                    <div className="action-buttons-wrapper">
                        <AnimatePresence initial={false} mode="wait">
                            {isEditing && <motion.div className='action-buttons' key='editing-buttons' {...actionButtonAnimations}>
                                <Button
                                    onClick={() => setNewWidgetWizardVisible(true)}
                                >
                                    <Icon icon='ion:add' height={24} />
                                </Button>

                                <Button
                                    onClick={() => setIsEditing(false)}
                                >
                                    <Icon icon='ion:checkmark' height={24} />
                                </Button>
                            </motion.div>}

                            {!isEditing && <motion.div className='action-buttons' key='viewing-buttons' {...actionButtonAnimations}>
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    key='start-editing'
                                    {...actionButtonAnimations}
                                >
                                    <Icon icon='ion:pencil' height={24} />
                                </Button>
                            </motion.div>}
                        </AnimatePresence>
                    </div>

                </header>

                <main>
                    <FolderContentContext.Provider value={{
                        activeFolder: folder,
                        isEditing,
                    }}>
                        <AnimatePresence initial={false}>
                            {widgets.map(w => {
                                return (<WidgetCard
                                    key={w.instanceId}
                                    onRemove={() => removeWidget(w)}
                                    exit={{ scale: 0 }}
                                >
                                    <w.widget.mainScreen config={w.configutation} />
                                </WidgetCard>)
                            })}
                        </AnimatePresence>
                    </FolderContentContext.Provider >
                </main>
            </motion.div>

            {newWidgetWizardVisible && <NewWidgetWizard folder={folder} onClose={() => setNewWidgetWizardVisible(false)} />}
        </>);
}