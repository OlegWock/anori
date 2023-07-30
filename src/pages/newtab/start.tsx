
import { mountPage, setPageTitle } from '@utils/mount';
import './styles.scss';
import { requestIconsFamily } from '@components/Icon';
import { FolderButton } from '@components/FolderButton';
import { FloatingDelayGroup } from '@floating-ui/react';
import { useEffect, useState } from 'react';
import { Modal } from '@components/Modal';
import { SettingsModal } from './settings/Settings';
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m } from 'framer-motion';
import { useFolders } from '@utils/user-data/hooks';
import { FolderContent } from './components/FolderContent';
import { homeFolder } from '@utils/user-data/types';
import { useHotkeys, useMirrorStateToRef, usePrevious } from '@utils/hooks';
import { preloadBrowserStorageAtom, storage, useBrowserStorageValue } from '@utils/storage';
import { applyTheme, defaultTheme } from '@utils/user-data/theme';
import { CommandMenu } from '@components/command-menu/CommandMenu';
import { watchForPermissionChanges } from '@utils/permissions';
import { ShortcutsHelp } from '@components/ShortcutsHelp';
import { WhatsNew } from '@components/WhatsNew';
import clsx from 'clsx';
import { CompactModeProvider } from '@utils/compact';
import { getAllCustomIcons } from '@utils/custom-icons';
import { initTranslation } from '@translations/index';
import { useTranslation } from 'react-i18next';
import { IS_ANDROID, IS_IPAD, IS_TOUCH_DEVICE } from '@utils/device';


const useSidebarOrientation = () => {
    const [sidebarOrientation, setSidebarOrientation] = useBrowserStorageValue('sidebarOrientation', 'auto');
    const [winOrientation, setWinOrientation] = useState<'landscape' | 'portrait'>(() => window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait');
    const winOrientationRef = useMirrorStateToRef(winOrientation);
    const computedSidebarOrientation = sidebarOrientation === 'auto' ? winOrientation === 'landscape' ? 'vertical' : 'horizontal' : sidebarOrientation;

    useEffect(() => {
        if (sidebarOrientation === 'auto') {
            const handler = () => {
                const newOrientation = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
                if (newOrientation !== winOrientationRef.current) {
                    setWinOrientation(newOrientation);
                }
            };

            window.addEventListener('resize', handler);
            handler();
            return () => window.removeEventListener('resize', handler);
        }
    }, [sidebarOrientation]);

    return computedSidebarOrientation;
};

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

    const sidebarOrientation = useSidebarOrientation();
    const { folders, activeFolder, setActiveFolder } = useFolders(true);
    const activeFolderIndex = folders.findIndex(f => f.id === activeFolder.id)!;
    const previousActiveFolderIndex = usePrevious(activeFolderIndex);
    const animationDirection = previousActiveFolderIndex === undefined
        ? (sidebarOrientation === 'vertical' ? 'down' : 'right')
        : activeFolderIndex > previousActiveFolderIndex
            ? (sidebarOrientation === 'vertical' ? 'down' : 'right')
            : (sidebarOrientation === 'vertical' ? 'up' : 'left');


    const [settingsVisible, setSettingsVisible] = useState(false);
    const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
    const [whatsNewVisible, setWhatsNewVisible] = useState(false);
    const [hasUnreadReleaseNotes, setHasUnreadReleaseNotes] = useBrowserStorageValue('hasUnreadReleaseNotes', false);
    const { t } = useTranslation();

    useHotkeys('meta+up, alt+up', () => swithFolderUp());
    useHotkeys('meta+left, alt+left', () => swithFolderUp());
    useHotkeys('meta+down, alt+down', () => swithFolderDown());
    useHotkeys('meta+right, alt+right', () => swithFolderDown());

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

    return (
        <MotionConfig transition={{ duration: 0.2, ease: 'easeInOut' }}>
            <AnimatePresence>
                <m.div
                    className={clsx("StartPage", `${sidebarOrientation}-sidebar`)}
                    key='start-page'
                >
                    <div className="sidebar">
                        <FloatingDelayGroup delay={{ open: 50, close: 50 }}>
                            {folders.map(f => {
                                return (<FolderButton sidebarOrientation={sidebarOrientation} key={f.id} icon={f.icon} name={f.name} active={activeFolder === f} onClick={() => setActiveFolder(f)} />);
                            })}
                            <div className="spacer" />
                            <FolderButton
                                sidebarOrientation={sidebarOrientation}
                                layoutId='whats-new'
                                icon="ion:newspaper-outline"
                                name={t('whatsNew')}
                                withRedDot={hasUnreadReleaseNotes}
                                onClick={() => {
                                    setWhatsNewVisible(true);
                                    setHasUnreadReleaseNotes(false);
                                }}
                            />
                            <FolderButton
                                sidebarOrientation={sidebarOrientation}
                                layoutId='settings'
                                icon="ion:settings-sharp"
                                name={t('settings.title')}
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
                </m.div>

                <CommandMenu key='command-menu' />

                {settingsVisible && <SettingsModal key='settings' onClose={() => setSettingsVisible(false)} />}
                {shortcutsHelpVisible && <Modal title={t('shortcuts.title')} key='shortcuts' closable onClose={() => setShortcutsHelpVisible(false)}>
                    <ShortcutsHelp />
                </Modal>}

                {whatsNewVisible && <Modal title={t('whatsNew')} className='WhatsNew-modal' key='whats-new' closable onClose={() => setWhatsNewVisible(false)}>
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

storage.getOne('theme').then(theme => {
    applyTheme(theme || defaultTheme);
});

storage.getOne('newTabTitle').then(title => {
    setPageTitle(title || 'Anori new tab');
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

preloadBrowserStorageAtom('compactMode', false);
preloadBrowserStorageAtom('automaticCompactMode', false);
preloadBrowserStorageAtom('automaticCompactModeThreshold', 1500);
preloadBrowserStorageAtom('hideEditFolderButton', false);
preloadBrowserStorageAtom('sidebarOrientation', 'auto');

// Fequently used in UI, preload to avoid flashes later
requestIconsFamily('ion');
requestIconsFamily('fluent');
getAllCustomIcons();

initTranslation().then(() => {
    mountPage(<CompactModeProvider>
        {/* strict mode temporary disabled due to strict https://github.com/framer/motion/issues/2094 */}
        <LazyMotion features={domMax}>
            <Start />
        </LazyMotion>
    </CompactModeProvider>);
});


if (IS_TOUCH_DEVICE) document.body.classList.add('is-touch-device');
if (IS_IPAD) document.body.classList.add('is-ipad');
if (IS_ANDROID) document.body.classList.add('is-android');


