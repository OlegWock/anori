import { AnoriPlugin, Folder, WidgetDescriptor } from '@utils/user-data/types';
import './NewWidgetWizard.scss';
import { availablePluginsWithWidgets } from '@plugins/all';
import { WidgetCard } from '@components/WidgetCard';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from '@components/Modal';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { useFolderWidgets } from '@utils/user-data/hooks';
import { GridDimensions, Layout, canFitItemInGrid } from '@utils/grid';
import { MotionScrollArea } from '@components/ScrollArea';


export type NewWidgetWizardProps = {
    folder: Folder,
    gridDimenstions: GridDimensions,
    layout: Layout,
    onClose: () => void,
};

export const NewWidgetWizard = ({ onClose, folder, gridDimenstions, layout }: NewWidgetWizardProps) => {
    const tryAddWidget = (plugin: AnoriPlugin, widget: WidgetDescriptor<any>, config: any) => {
        const position = canFitItemInGrid({ grid: gridDimenstions, layout, item: widget.size });
        if (!position) {
            alert("Can't fit element in grid, sorry");
            return;
        }
        addWidget({ plugin, widget, config, position });
        onClose();
    };

    const { addWidget } = useFolderWidgets(folder);
    const [selectedPlugin, setSelectedPlugin] = useState<AnoriPlugin | undefined>(undefined);
    const [selectedWidget, setSelectedWidget] = useState<WidgetDescriptor<any> | undefined>(undefined);

    console.log('Render NewWidgetWizard', { selectedPlugin, selectedWidget });
    const inConfigurationStage = !!(selectedPlugin && selectedWidget);
    return (
        <Modal
            title={inConfigurationStage ? 'Configure widget' : 'Add widget'}
            headerButton={inConfigurationStage ? <Button withoutBorder onClick={() => {
                setSelectedPlugin(undefined);
                setSelectedWidget(undefined);
            }}><Icon icon='ion:arrow-back' width={24} height={24} /></Button> : undefined}
            closable
            onClose={onClose}
            className='NewWidgetWizard-wrapper'
        >

            <AnimatePresence initial={false} mode="wait">
                {(inConfigurationStage && !!selectedWidget.configurationScreen) && <motion.div
                    key='configuration'
                    className='NewWidgetWizard'
                    transition={{ duration: 0.18 }}
                    initial={{ translateX: '-50%', opacity: 0 }}
                    animate={{ translateX: '0%', opacity: 1 }}
                    exit={{ translateX: '-50%', opacity: 0 }}
                >
                    <selectedWidget.configurationScreen widgetId={selectedWidget.id} saveConfiguration={(config) => tryAddWidget(selectedPlugin, selectedWidget, config)} />
                </motion.div>}


                {!inConfigurationStage && <MotionScrollArea
                    key='select'
                    className='NewWidgetWizard'
                    transition={{ duration: 0.18 }}
                    initial={{ translateX: '50%', opacity: 0 }}
                    animate={{ translateX: '0%', opacity: 1 }}
                    exit={{ translateX: '50%', opacity: 0 }}
                >
                    <div className='new-widget-content'>
                        {availablePluginsWithWidgets.map(plugin => {
                            return (<section key={plugin.id}>
                                <h2>{plugin.name}</h2>
                                <div className="widgets-mock-background">
                                    <div className='widgets-mocks'>
                                        {plugin.widgets.map(widget => {
                                            return (
                                                <div key={widget.id}>
                                                    <WidgetCard
                                                        withAnimation={false}
                                                        style={{ margin: 0 }}
                                                        width={widget.size.width}
                                                        height={widget.size.height}
                                                        onClick={() => {
                                                            if (widget.configurationScreen) {
                                                                setSelectedPlugin(plugin);
                                                                setSelectedWidget(widget);
                                                            } else {
                                                                tryAddWidget(plugin, widget, {});
                                                            }
                                                        }}
                                                    >
                                                        <widget.mock />
                                                        <div className="interaction-blocker"></div>
                                                    </WidgetCard>
                                                    <div className='widget-name'>{widget.name}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>);
                        })}
                    </div>
                </MotionScrollArea>}
            </AnimatePresence>
        </Modal>
    );
};