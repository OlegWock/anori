import { ShortcutHint } from './ShortcutHint';
import './ShortcutsHelp.scss';

export const ShortcutsHelp = () => {
    return (<div className='ShortcutsHelp'>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+h' />
            </div>
            <div>Show/hide shortcuts cheatsheet</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+s' />
            </div>
            <div>Show/hide settings</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='meta+k' />
            </div>
            <div>Display command menu</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='Esc' />
            </div>
            <div>Close command menu or modal window</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='meta+up' />
                <ShortcutHint shortcut='alt+up' />
            </div>
            <div>Switch to folder above</div>
        </div>
        <div className="shortcut-row">
        <div className='hint-wrapper'>
                <ShortcutHint shortcut='meta+down' />
                <ShortcutHint shortcut='alt+down' />
            </div>
            <div>Switch to folder below</div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+1' />
            </div>
            <div>
                Switch to 1st folder (works with other numbers too!)
            </div>
        </div>

        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+e' />
            </div>
            <div>
                Edit current folder
            </div>
        </div>
        <div className="shortcut-row">
            <div className='hint-wrapper'>
                <ShortcutHint shortcut='alt+a' />
            </div>
            <div>
                Add new widget to current folder
            </div>
        </div>
    </div>);
}