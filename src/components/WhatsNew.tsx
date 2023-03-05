import { ShortcutHint } from './ShortcutHint';
import './WhatsNew.scss';

export const WhatsNew = () => {
    return (<div className="WhatsNew">
        <section>
            <h2>1.2.0</h2>
            <ul>
                <li>We got rid of a few internal libraries and adjusted compilation settings, so extension files now take less space. This should make loading extension slightly faster</li>
                <li>Added 'Show animation on open' option to settings</li>
            </ul>
        </section>
        <section>
            <h2>1.1.0</h2>
            <ul>
                <li>Added support for shortcuts across extension. Press <ShortcutHint shortcut='alt+h' /> to see them all!</li>
                <li>Added compact mode</li>
                <li>Added new 'Top sites' widget (Firefox & Chrome)</li>
            </ul>
        </section>
    </div>)
};