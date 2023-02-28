import { ShortcutHint } from './ShortcutHint';
import './WhatsNew.scss';

export const WhatsNew = () => {
    return (<div className="WhatsNew">
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