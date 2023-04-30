
import { mountPage, setPageTitle } from '@utils/mount';
import './styles.scss';
import { requestIconsFamily } from '@components/Icon';
import { FolderButton } from '@components/FolderButton';
import { FloatingDelayGroup } from '@floating-ui/react';
import { useState } from 'react';
import { Modal } from '@components/Modal';
import { Settings } from './components/Settings';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useFolders } from '@utils/user-data/hooks';
import { FolderContent } from './components/FolderContent';
import { homeFolder } from '@utils/user-data/types';
import { useHotkeys, usePrevious } from '@utils/hooks';
import { storage, useBrowserStorageValue } from '@utils/storage';
import { applyTheme, defaultTheme } from '@utils/user-data/theme';
import { CommandMenu } from '@components/command-menu/CommandMenu';
import { watchForPermissionChanges } from '@utils/permissions';
import { ShortcutsHelp } from '@components/ShortcutsHelp';
import { WhatsNew } from '@components/WhatsNew';
import clsx from 'clsx';
import { CompactModeProvider, useSizeSettings } from '@utils/compact';
import { getAllCustomIcons } from '@utils/custom-icons';


const Start = () => {
    const switchToFolderByIndex = (ind: number) => {
        if (ind >= folders.length) return;
        setActiveFolder(folders[ind])
    };

    const swithFolderUp = () => {
        setActiveFolder(folders[activeFolderIndex === 0 ? folders.length - 1 : activeFolderIndex - 1]);
    };

    const swithFolderDown = () => {
        setActiveFolder(folders[activeFolderIndex === folders.length - 1 ? 0 : activeFolderIndex + 1]);
    };

    const { folders, activeFolder, setActiveFolder } = useFolders(true);
    const activeFolderIndex = folders.findIndex(f => f.id === activeFolder.id)!;
    const previousActiveFolderIndex = usePrevious(activeFolderIndex);
    const animationDirection = previousActiveFolderIndex === undefined
        ? 'down'
        : activeFolderIndex > previousActiveFolderIndex
            ? 'down'
            : 'up';


    const [settingsVisible, setSettingsVisible] = useState(false);
    const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
    const [whatsNewVisible, setWhatsNewVisible] = useState(false);
    const [hasUnreadReleaseNotes, setHasUnreadReleaseNotes] = useBrowserStorageValue('hasUnreadReleaseNotes', false);

    useHotkeys('meta+up, alt+up', () => swithFolderUp());
    useHotkeys('meta+down, alt+down', () => swithFolderDown());

    useHotkeys('alt+h', () => setShortcutsHelpVisible(v => !v));
    useHotkeys('alt+s', () => setSettingsVisible(v => !v));

    useHotkeys('alt+1', () => switchToFolderByIndex(0));
    useHotkeys('alt+2', () => switchToFolderByIndex(1));
    useHotkeys('alt+3', () => switchToFolderByIndex(2));
    useHotkeys('alt+4', () => switchToFolderByIndex(3));
    useHotkeys('alt+5', () => switchToFolderByIndex(4));
    useHotkeys('alt+6', () => switchToFolderByIndex(5));
    useHotkeys('alt+7', () => switchToFolderByIndex(6));
    useHotkeys('alt+8', () => switchToFolderByIndex(7));
    useHotkeys('alt+9', () => switchToFolderByIndex(8));

    const { isCompact } = useSizeSettings();

    return (
        <MotionConfig transition={{ duration: 0.2, ease: 'easeInOut' }}>
            <AnimatePresence>
                <motion.div
                    className={clsx("StartPage", { 'compact': isCompact })}
                    key='start-page'
                >
                    <div className="sidebar">
                        <FloatingDelayGroup delay={{ open: 50, close: 50 }}>
                            {folders.map(f => {
                                return (<FolderButton key={f.id} icon={f.icon} name={f.name} active={activeFolder === f} onClick={() => setActiveFolder(f)} />);
                            })}
                            <div className="spacer" />
                            <FolderButton
                                layoutId='whats-new'
                                icon="ion:newspaper-outline"
                                name="What's new"
                                withRedDot={hasUnreadReleaseNotes}
                                onClick={() => {
                                    setWhatsNewVisible(true);
                                    setHasUnreadReleaseNotes(false);
                                }}
                            />
                            <FolderButton
                                layoutId='settings'
                                icon="ion:settings-sharp"
                                name='Settings'
                                onClick={() => setSettingsVisible(true)}
                                whileHover={{ rotate: 180 }}
                                transition={{ type: 'spring', duration: 0.1 }}
                            />
                        </FloatingDelayGroup>
                    </div>

                    <div className="widgets-area">
                        <AnimatePresence initial={false} mode='wait' custom={animationDirection}>
                            <FolderContent key={activeFolder.id} folder={activeFolder} animationDirection={animationDirection} />
                        </AnimatePresence>
                    </div>
                </motion.div>

                <CommandMenu key='command-menu' />

                {settingsVisible && <Modal title='Settings' key='settings' className='settings-modal' closable onClose={() => setSettingsVisible(false)}>
                    <Settings />
                </Modal>}
                {shortcutsHelpVisible && <Modal title='Shortcuts' key='shortcuts' closable onClose={() => setShortcutsHelpVisible(false)}>
                    <ShortcutsHelp />
                </Modal>}

                {whatsNewVisible && <Modal title="What's new" className='WhatsNew-modal' key='whats-new' closable onClose={() => setWhatsNewVisible(false)}>
                    <WhatsNew />
                </Modal>}
            </AnimatePresence>
        </MotionConfig>
    );
};


watchForPermissionChanges();

storage.getOne('folders').then(foldersFromStorage => {
    const folders = [homeFolder, ...(foldersFromStorage || [])];
    folders.forEach(f => requestIconsFamily(f.icon.split(':')[0]));
});
setPageTitle('Anori new tab');
storage.getOne('theme').then(theme => {
    applyTheme(theme || defaultTheme);
});

storage.getOne('showLoadAnimation').then(showLoadAnimation => {
    const div = document.querySelector('.loading-cover');
    if (!div) return;
    if (!showLoadAnimation) {
        div.remove();
        return;
    }

    div.addEventListener("animationend", () => div.remove());
    div.classList.add('active');
});

// Fequently used in UI, preload to avoid flashes later
requestIconsFamily('ion');
requestIconsFamily('fluent');
getAllCustomIcons();

mountPage(<CompactModeProvider>
    <Start />
</CompactModeProvider>);


