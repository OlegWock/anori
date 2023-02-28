import { ShortcutHint } from './ShortcutHint';
import './WhatsNew.scss';

export const WhatsNew = () => {
    return (<div className="WhatsNew">
        <section>
            <h2>1.0.6</h2>
            <ul>
                <li>Added support for shortcuts across extension. Press <ShortcutHint shortcut='alt+h' /> to see them all!</li>
            </ul>
        </section>
    </div>)
};