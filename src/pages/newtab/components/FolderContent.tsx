import { AnimatePresence, PanInfo, motion } from 'framer-motion';
import './FolderContent.scss';
import { Folder, WidgetInFolderWithMeta } from '@utils/user-data/types';
import { Icon } from '@components/Icon';
import { useEffect, useState } from 'react';
import { Button } from '@components/Button';
import { NewWidgetWizard } from './NewWidgetWizard';
import { useFolderWidgets } from '@utils/user-data/hooks';
import { WidgetCard } from '@components/WidgetCard';
import { FolderContentContext } from '@utils/FolderContentContext';
import { useRef } from 'react';
import { fixHorizontalOverflows, layoutTo2DArray, positionToPixelPosition, snapToSector, useGrid, willItemOverlay } from '@utils/grid';
import { useHotkeys, useWindowIsResizing } from '@utils/hooks';
import { Modal } from '@components/Modal';
import { WidgetMetadataContext } from '@utils/plugin';
import { useSizeSettings } from '@utils/compact';
import { useBrowserStorageValue } from '@utils/storage';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@components/ScrollArea';
import { Onboarding } from '@components/Onboarding';
import clsx from 'clsx';


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
    const tryRepositionWidget = (widget: WidgetInFolderWithMeta<any, any, any>, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!mainRef.current) return;
        console.log('tryRepositionWidget', { widget, event, info });
        const mainBox = mainRef.current.getBoundingClientRect();
        const relativePoint = {
            x: info.point.x - mainBox.x,
            y: info.point.y - mainBox.y,
        };
        const possibleSnapPoints = snapToSector({ grid: grisDimenstions, position: relativePoint });
        console.log('Possible snap points:', possibleSnapPoints);
        const snapPoint = possibleSnapPoints.find(p => !willItemOverlay({
            arr: layoutTo2DArray({
                grid: grisDimenstions,
                layout: widgets.filter(w => w.instanceId !== widget.instanceId),
            }),
            item: {
                ...widget,
                ...p.position,
            }
        }));
        console.log('Span point selected', snapPoint);
        if (!snapPoint) return;
        moveWidget(widget, snapPoint.position);
    };

    const { widgets, removeWidget, moveWidget, updateWidgetConfig, folderDataLoaded } = useFolderWidgets(folder);
    const [isEditing, setIsEditing] = useState(false);
    const [newWidgetWizardVisible, setNewWidgetWizardVisible] = useState(false);
    const [editingWidget, setEditingWidget] = useState<null | WidgetInFolderWithMeta<any, any, any>>(null);
    const [hideEditFolderButton, setHideEditFolderButton] = useBrowserStorageValue('hideEditFolderButton', false);

    const { blockSize, gapSize } = useSizeSettings();
    const { t } = useTranslation();
    const mainRef = useRef<HTMLDivElement>(null);
    const grisDimenstions = useGrid(mainRef, blockSize);

    const shouldShowOnboarding = widgets.length === 0 && folderDataLoaded && !isEditing;

    // We need this to workaround framer motion auto-repozition of drag elements on window resize
    const isResizingWindow = useWindowIsResizing();

    const adjustedLayout = fixHorizontalOverflows({ grid: grisDimenstions, layout: widgets });

    console.log('Render folder content', { grisDimenstions, adjusterdLayout: adjustedLayout });

    useEffect(() => {
        setIsEditing(false);
    }, [folder.id]);

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
                boxSize: grisDimenstions.boxSize,
            }}>
                <motion.div
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

                                {!isEditing && !hideEditFolderButton && <motion.div className='action-buttons' key='viewing-buttons' {...actionButtonAnimations}>
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
                    <motion.main layout layoutRoot ref={mainRef}>
                        <AnimatePresence>
                            {isEditing && new Array(grisDimenstions.colums * grisDimenstions.rows).fill(null).map((_, i) => {
                                const x = i % grisDimenstions.colums;
                                const y = Math.floor(i / grisDimenstions.colums);
                                const position = positionToPixelPosition({ grid: grisDimenstions, positon: { x, y } });
                                return (<motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    key={`${x}_${y}`}
                                    style={{
                                        position: 'absolute',
                                        top: position.y,
                                        left: position.x,
                                        margin: gapSize,
                                        width: grisDimenstions.boxSize - gapSize * 2,
                                        height: grisDimenstions.boxSize - gapSize * 2,
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: 12,
                                    }}
                                />);
                            })}
                        </AnimatePresence>
                        <AnimatePresence initial={false}>
                            {adjustedLayout.map((w, i) => {
                                const position = positionToPixelPosition({ grid: grisDimenstions, positon: w });
                                return (<WidgetMetadataContext.Provider key={w.instanceId} value={{
                                    pluginId: w.pluginId,
                                    instanceId: w.instanceId,
                                    config: w.configutation,
                                    updateConfig: (config) => updateWidgetConfig(w.instanceId, config),
                                }}>
                                    <WidgetCard
                                        drag
                                        dragConstraints={isResizingWindow ? { top: 0, left: 0, right: 0, bottom: 0 } : mainRef}
                                        dragSnapToOrigin
                                        dragElastic={0}
                                        onDragEnd={(e, info) => tryRepositionWidget(w, e, info)}
                                        withAnimation={w.widget.withAnimation}
                                        whileDrag={{ zIndex: 9, boxShadow: '0px 4px 4px 3px rgba(0,0,0,0.4)' }}
                                        key={w.instanceId}
                                        onRemove={() => removeWidget(w)}
                                        onEdit={w.widget.configurationScreen ? () => setEditingWidget(w) : undefined}
                                        width={w.width}
                                        height={w.height}
                                        style={{
                                            position: 'absolute',
                                            top: position.y,
                                            left: position.x,
                                        }}
                                    >
                                        <w.widget.mainScreen instanceId={w.instanceId} config={w.configutation} />
                                    </WidgetCard>
                                </WidgetMetadataContext.Provider>);
                            })}
                        </AnimatePresence>
                        {shouldShowOnboarding && <Onboarding />}
                    </motion.main>

                </motion.div>

                <AnimatePresence>
                    {newWidgetWizardVisible && <NewWidgetWizard
                        folder={folder}
                        key='new-widget-wizard'
                        onClose={() => setNewWidgetWizardVisible(false)}
                        gridDimenstions={grisDimenstions}
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
                            <motion.div className='edit-widget-content' transition={{ duration: 0.18 }} animate={{opacity: 1, translateX: '0%'}}>
                                <editingWidget.widget.configurationScreen instanceId={editingWidget.instanceId} widgetId={editingWidget.widgetId} currentConfig={editingWidget.configutation} saveConfiguration={(config) => {
                                    updateWidgetConfig(editingWidget.instanceId, config);
                                    setEditingWidget(null);
                                }} />
                            </motion.div>
                        </ScrollArea>
                    </Modal>}
                </AnimatePresence>
            </FolderContentContext.Provider >
        </>);
}