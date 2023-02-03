import { AodakePlugin, Folder, WidgetDescriptor } from '@utils/user-data/types';
import './NewWidgetWizard.scss';
import { availablePluginsWithWidgets } from '@plugins/all';
import { WidgetCard } from '@components/WidgetCard';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from '@components/Modal';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { useFolderWidgets } from '@utils/user-data/hooks';


export type NewWidgetWizardProps = {
    folder: Folder,
    onClose: () => void,
};

export const NewWidgetWizard = ({ onClose, folder }: NewWidgetWizardProps) => {
    const { addWidget } = useFolderWidgets(folder);
    const [selectedPlugin, setSelectedPlugin] = useState<AodakePlugin | undefined>(undefined);
    const [selectedWidget, setSelectedWidget] = useState<WidgetDescriptor<any> | undefined>(undefined);

    console.log('Render NewWidgetWizard', { selectedPlugin, selectedWidget });
    const inConfigurationStage = !!(selectedPlugin && selectedWidget);
    return (
        <Modal
            title={inConfigurationStage ? 'Configure widget' : 'Add widget'}
            headerButton={inConfigurationStage ? <Button onClick={() => {
                setSelectedPlugin(undefined);
                setSelectedWidget(undefined);
            }}><Icon icon='ion:arrow-back' width={24} height={24} /></Button> : undefined}
            closable
            onClose={onClose}
            className='NewWidgetWizard-wrapper'
        >

            <AnimatePresence initial={false} mode="popLayout">
                {inConfigurationStage && <motion.div
                    key='configuration'
                    className='NewWidgetWizard'
                    initial={{ translateX: '-50%', opacity: 0 }}
                    animate={{ translateX: '0%', opacity: 1 }}
                    exit={{ translateX: '-50%', opacity: 0 }}
                >
                    <selectedWidget.configurationScreen saveConfiguration={(config) => {
                        addWidget({ plugin: selectedPlugin, widget: selectedWidget, config });
                        onClose();
                    }} />
                </motion.div>}


                {!inConfigurationStage && <motion.div
                    key='select'
                    className='NewWidgetWizard'
                    initial={{ translateX: '50%', opacity: 0 }}
                    animate={{ translateX: '0%', opacity: 1 }}
                    exit={{ translateX: '50%', opacity: 0 }}
                >
                    {availablePluginsWithWidgets.map(plugin => {
                        return (<section key={plugin.id}>
                            <h2>{plugin.name}</h2>
                            <div className='widgets-mocks'>
                                {plugin.widgets.map(widget => {
                                    return (<WidgetCard
                                        key={widget.id}
                                        onClick={() => {
                                            setSelectedPlugin(plugin);
                                            setSelectedWidget(widget);
                                        }}
                                    >
                                        <widget.mock />
                                    </WidgetCard>);
                                })}
                            </div>
                        </section>);
                    })}
                </motion.div>}
            </AnimatePresence>
        </Modal>
    );
};