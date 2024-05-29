import { AnimatePresence, m } from 'framer-motion';
import './FolderContent.scss';
import { Folder, WidgetInFolderWithMeta } from '@utils/user-data/types';
import { Icon } from '@components/Icon';
import { CSSProperties, Suspense, lazy, useState } from 'react';
import { Button } from '@components/Button';
import { tryMoveWidgetToFolder, useFolderWidgets } from '@utils/user-data/hooks';
import { FolderContentContext } from '@utils/FolderContentContext';
import { useRef } from 'react';
import { useGrid } from '@utils/grid';
import { useHotkeys } from '@utils/hooks';
import { Modal } from '@components/Modal';
import { useSizeSettings } from '@utils/compact';
import { useBrowserStorageValue } from '@utils/storage/api';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@components/ScrollArea';
import clsx from 'clsx';
import { LayoutChange, WidgetsGrid } from './WidgetsGrid';
import { atom, useAtom } from 'jotai';


const NewWidgetWizard = lazy(() => import('./NewWidgetWizard').then(m => ({default: m.NewWidgetWizard})));

type FolderContentProps = {
    folder: Folder,
    animationDirection: 'up' | 'down' | 'left' | 'right' | null,
};

const variants = {
    visible: {
        translateY: '0%',
        translateX: '0%',
        opacity: 1,
    },
    initial: (custom: 'up' | 'down') => {
        if (custom === 'up') {
            return {
                translateY: '-35%',
                opacity: 0,
            };
        } else if (custom === 'down') {
            return {
                translateY: '35%',
                opacity: 0,
            };
        } else if (custom === 'left') {
            return {
                translateX: '-35%',
                opacity: 0,
            };
        } else if (custom === 'right') {
            return {
                translateX: '35%',
                opacity: 0,
            };
        } else {
            return {
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
        } else if (custom === 'down') {
            return {
                translateY: '-35%',
                opacity: 0,
            };
        } else if (custom === 'left') {
            return {
                translateX: '35%',
                opacity: 0,
            };
        } else if (custom === 'right') {
            return {
                translateX: '-35%',
                opacity: 0,
            };
        } else {
            return {
                opacity: 0,
            }
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

const isEditingModeActiveAtom = atom(false);

export const FolderContent = ({ folder, animationDirection }: FolderContentProps) => {
    const onLayoutUpdate = (changes: LayoutChange[]) => {
        changes.forEach(async (ch) => {
            if (ch.type === 'remove') {
                removeWidget(ch.instanceId);
            } else if (ch.type === 'change-position') {
                moveWidget(ch.instanceId, ch.newPosition);
            } else if (ch.type === 'move-to-folder') {
                tryMoveWidgetToFolder(folder.id, ch.folderId, ch.instanceId, gridDimensions);
            } else if (ch.type === 'resize') {
                resizeWidget(ch.instanceId, { width: ch.width, height: ch.height });
            }
        })
    };

    const { widgets, removeWidget, moveWidget, resizeWidget, updateWidgetConfig, folderDataLoaded } = useFolderWidgets(folder);
    const [isEditing, setIsEditing] = useAtom(isEditingModeActiveAtom);
    const [newWidgetWizardVisible, setNewWidgetWizardVisible] = useState(false);
    const [editingWidget, setEditingWidget] = useState<null | WidgetInFolderWithMeta<any, any, any>>(null);
    const [hideEditFolderButton, setHideEditFolderButton] = useBrowserStorageValue('hideEditFolderButton', false);

    const { blockSize, minBlockSize, gapSize } = useSizeSettings();
    const { t } = useTranslation();
    const mainRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const gridDimensions = useGrid(scrollAreaRef, blockSize, minBlockSize, widgets);

    const shouldShowOnboarding = widgets.length === 0 && folderDataLoaded && !isEditing;

    console.log('Render folder content', { gridDimensions, layout: widgets });

    useHotkeys('alt+e', () => {
        setIsEditing(true);
        setNewWidgetWizardVisible(true);
    });

    useHotkeys('alt+a', () => {
        setIsEditing(true);
        setNewWidgetWizardVisible(true);
    });

    return (
        <>
            <FolderContentContext.Provider value={{
                activeFolder: folder,
                isEditing,
                grid: gridDimensions,
                gridRef: mainRef,
            }}>
                <m.div
                    key={`FolderContent-${folder.id}`}
                    className={clsx("FolderContent", shouldShowOnboarding && "onboarding-visible")}
                    transition={{
                        duration: 0.2,
                        type: 'spring',
                    }}
                    variants={variants}
                    initial="initial"
                    animate="visible"
                    exit="exit"
                    custom={animationDirection}
                    style={{
                        '--widget-box-size': gridDimensions.boxSize,
                        '--widget-box-size-px': gridDimensions.boxSize + 'px',
                        '--widget-box-percent': (gridDimensions.boxSize - minBlockSize) / (blockSize - minBlockSize),
                    } as CSSProperties}
                >
                    <header
                        style={{
                            marginLeft: gapSize,
                            marginRight: gapSize,
                        }}
                    >
                        <h1>{folder.name}</h1>

                        <div className="action-buttons-wrapper">
                            <AnimatePresence initial={false} mode="wait">
                                {isEditing && <m.div className='action-buttons' key='editing-buttons' {...actionButtonAnimations}>
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
                                </m.div>}

                                {!isEditing && !hideEditFolderButton && <m.div className='action-buttons' key='viewing-buttons' {...actionButtonAnimations}>
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        key='start-editing'
                                        {...actionButtonAnimations}
                                    >
                                        <Icon icon='ion:pencil' height={24} />
                                    </Button>
                                </m.div>}
                            </AnimatePresence>
                        </div>

                    </header>
                    <WidgetsGrid
                        gridRef={mainRef}
                        scrollAreaRef={scrollAreaRef}
                        isEditing={isEditing}
                        gapSize={gapSize}
                        layout={widgets}
                        gridDimensions={gridDimensions}
                        onEditWidget={setEditingWidget}
                        onUpdateWidgetConfig={updateWidgetConfig}
                        onLayoutUpdate={onLayoutUpdate}
                        showOnboarding={shouldShowOnboarding}
                    />

                </m.div>

                <Suspense>
                    <AnimatePresence>
                        {newWidgetWizardVisible && <NewWidgetWizard
                            folder={folder}
                            key='new-widget-wizard'
                            onClose={() => setNewWidgetWizardVisible(false)}
                            gridDimensions={gridDimensions}
                            layout={widgets}
                        />}


                        {(!!editingWidget && editingWidget.widget.configurationScreen) && <Modal
                            title={t("editWidget")}
                            key='edit-widget-modal'
                            className='edit-widget-modal'
                            onClose={() => setEditingWidget(null)}
                            closable
                        >
                            <ScrollArea className='edit-widget-scrollarea'>
                                <m.div className='edit-widget-content' transition={{ duration: 0.18 }} animate={{ opacity: 1, translateX: '0%' }}>
                                    <editingWidget.widget.configurationScreen instanceId={editingWidget.instanceId} widgetId={editingWidget.widgetId} currentConfig={editingWidget.configutation} saveConfiguration={(config) => {
                                        updateWidgetConfig(editingWidget.instanceId, config);
                                        setEditingWidget(null);
                                    }} />
                                </m.div>
                            </ScrollArea>
                        </Modal>}
                    </AnimatePresence>
                </Suspense>
            </FolderContentContext.Provider >
        </>);
}