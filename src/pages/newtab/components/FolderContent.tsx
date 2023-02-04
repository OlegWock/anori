import { AnimatePresence, PanInfo, motion } from 'framer-motion';
import './FolderContent.scss';
import { Folder, WidgetInFolderWithMeta } from '@utils/user-data/types';
import { Icon } from '@components/Icon';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Button } from '@components/Button';
import { NewWidgetWizard } from './NewWidgetWizard';
import { useFolderWidgets } from '@utils/user-data/hooks';
import { WidgetCard } from '@components/WidgetCard';
import { FolderContentContext } from '@utils/FolderContentContext';
import { useRef } from 'react';
import { DEFAULT_CARD_MARGIN, Layout, LayoutItem, fixHorizontalOverflows, layoutTo2DArray, positionToPixelPosition, snapToSector, useGrid, willItemOverlay } from '@utils/grid';
import { useWindowIsResizing } from '@utils/hooks';
import { Modal } from '@components/Modal';


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
    const tryRepositionWidget = (widget: WidgetInFolderWithMeta<any>, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

    const { widgets, removeWidget, moveWidget, updateWidgetConfig } = useFolderWidgets(folder);
    const [isEditing, setIsEditing] = useState(false);
    const [newWidgetWizardVisible, setNewWidgetWizardVisible] = useState(false);
    const [editingWidget, setEditingWidget] = useState<null | WidgetInFolderWithMeta<any>>(null);

    const mainRef = useRef<HTMLDivElement>(null);
    const grisDimenstions = useGrid(mainRef);

    // We need this to workaround framer motion auto-repozition of drag elements on window resize
    const isResizingWindow = useWindowIsResizing();

    const adjusterdLayout = fixHorizontalOverflows({grid: grisDimenstions, layout: widgets});

    console.log('Render folder content', {grisDimenstions, adjusterdLayout});

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
                <header
                    style={{
                        marginLeft: DEFAULT_CARD_MARGIN,
                        marginRight: DEFAULT_CARD_MARGIN,
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
                <FolderContentContext.Provider value={{
                    activeFolder: folder,
                    isEditing,
                    boxSize: grisDimenstions.boxSize,
                }}>
                    <motion.main layout layoutRoot ref={mainRef}>
                        <AnimatePresence initial={false}>
                            {/* {widgets.map((w, i) => { */}
                            {adjusterdLayout.map((w, i) => {
                                const position = positionToPixelPosition({ grid: grisDimenstions, positon: w });
                                return (<WidgetCard
                                    drag
                                    dragConstraints={isResizingWindow ? { top: 0, left: 0, right: 0, bottom: 0 } : mainRef}
                                    dragSnapToOrigin
                                    dragElastic={0}
                                    onDragEnd={(e, info) => tryRepositionWidget(w, e, info)}
                                    whileDrag={{ zIndex: 9, boxShadow: '0px 4px 4px 3px rgba(0,0,0,0.4)' }}
                                    key={w.instanceId}
                                    onRemove={() => removeWidget(w)}
                                    onEdit={() => setEditingWidget(w)}
                                    width={w.width}
                                    height={w.height}
                                    style={{
                                        position: 'absolute',
                                        top: position.y,
                                        left: position.x,
                                    }}
                                >
                                    <w.widget.mainScreen instanceId={w.instanceId} config={w.configutation} />
                                </WidgetCard>);
                            })}
                        </AnimatePresence>
                    </motion.main>
                </FolderContentContext.Provider >
            </motion.div>

            {newWidgetWizardVisible && <NewWidgetWizard
                folder={folder}
                onClose={() => setNewWidgetWizardVisible(false)}
                gridDimenstions={grisDimenstions}
                layout={widgets}
            />}

            {!!editingWidget && <Modal
                title="Edit widget"
                onClose={() => setEditingWidget(null)}
                closable
            >
                <editingWidget.widget.configurationScreen currentConfig={editingWidget.configutation} saveConfiguration={(config) => {
                    updateWidgetConfig(editingWidget.instanceId, config);
                    setEditingWidget(null);
                }} />
            </Modal>}
        </>);
}