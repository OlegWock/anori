import { useTranslation } from 'react-i18next';
import { ShortcutHint } from './ShortcutHint';
import './ShortcutsHelp.scss';

export const ShortcutsHelp = () => {
    const { t } = useTranslation();
    return (<div className='ShortcutsHelp'>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+h' />
            </div>
            <div>{t("shortcuts.showCheatsheet")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+s' />
            </div>
            <div>{t("shortcuts.toggleSettings")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='meta+k' />
            </div>
            <div>{t("shortcuts.displayCommandMenu")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='Esc' />
            </div>
            <div>{t("shortcuts.closeMenuOrModal")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='meta+up' />
                <ShortcutHint shortcut='alt+up' />
            </div>
            <div>{t("shortcuts.switchToFolderAbove")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='meta+down' />
                <ShortcutHint shortcut='alt+down' />
            </div>
            <div>{t("shortcuts.switchToFolderBelow")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+1' />
            </div>
            <div>{t("shortcuts.switchToNFolder")}</div>
        </div>

        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+e' />
            </div>
            <div>{t("shortcuts.editCurrentFolder")}</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+a' />
            </div>
            <div>{t("shortcuts.addNewWidget")}</div>
        </div>
    </div>);
}