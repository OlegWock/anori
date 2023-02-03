import { injectStyles, mountPage, setPageTitle } from '@utils/mount';
import './styles.scss';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Icon, requestIconsFamily } from '@components/Icon';
import { FolderButton } from '@components/FolderButton';
import { FloatingDelayGroup } from '@floating-ui/react-dom-interactions';
import { useState } from 'react';
import { Modal } from '@components/Modal';
import { Settings } from './components/Settings';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useFolders } from '@utils/user-data/hooks';
import { FolderContent } from './components/FolderContent';
import { Folder, homeFolder } from '@utils/user-data/types';
import { usePrevious } from '@utils/hooks';
import { storage } from '@utils/storage';

const Start = () => {
    const { folders, activeFolder, setActiveFolder } = useFolders(true);
    const activeFolderIndex = folders.findIndex(f => f.id === activeFolder.id)!;
    const previousActiveFolderIndex = usePrevious(activeFolderIndex);
    const animationDirection = previousActiveFolderIndex === undefined
        ? 'down'
        : activeFolderIndex > previousActiveFolderIndex
            ? 'down'
            : 'up';

    // console.log('Folders:', folders);

    const [settingsVisible, setSettingsVisible] = useState(false);

    return (
        <MotionConfig transition={{ duration: 0.2, }}>
            <AnimatePresence>
                <motion.div
                    className="StartPage"
                >
                    <div className="sidebar">
                        <FloatingDelayGroup delay={{ open: 50, close: 50 }}>
                            {folders.map(f => {
                                return (<FolderButton key={f.id} icon={f.icon} name={f.name} active={activeFolder === f} onClick={() => setActiveFolder(f)} />);
                            })}
                            <div className="spacer" />
                            <FolderButton layoutId='settings' icon="ion:settings-sharp" name='Settings' onClick={() => setSettingsVisible(true)} />
                        </FloatingDelayGroup>
                    </div>

                    <div className="widgets-area">
                        <AnimatePresence initial={false} mode='wait' custom={animationDirection}>
                            <FolderContent key={activeFolder.id} folder={activeFolder} active animationDirection={animationDirection} />
                        </AnimatePresence>
                    </div>
                </motion.div>

                {settingsVisible && <Modal title='Settings' key='settings' closable onClose={() => setSettingsVisible(false)}>
                    <Settings />
                </Modal>}
            </AnimatePresence>
        </MotionConfig>
    );
};

storage.getOne('folders').then(foldersFromStorage => {
    const folders = [homeFolder, ...(foldersFromStorage || [])];
    folders.forEach(f => requestIconsFamily(f.icon.split(':')[0]));
});
setPageTitle('Aodake new tab');
mountPage(<Start />);


