import { ScrollArea } from './ScrollArea';
import { ShortcutHint } from './ShortcutHint';
import './WhatsNew.scss';

export const WhatsNew = () => {
    return (<div className="WhatsNew">
        <ScrollArea>
            <div className='WhatsNew-content'>
                <section>
                    <h2>1.4.0</h2>
                    <ul>
                        <li>Recently closed tabs widget now presented in two sizes for dear folks with smaller screens &lt;3.</li>
                        <li>You can now select first day of a week in calendar widget.</li>
                    </ul>
                </section>
                <section>
                    <h2>1.3.0</h2>
                    <ul>
                        <li>Now you can search in all icon sets at once (I don't believe I added this only now lol).</li>
                        <li>Icon picker now doesn't go beyond screen edge on smaller screens.</li>
                    </ul>
                </section>
                <section>
                    <h2>1.2.0</h2>
                    <ul>
                        <li>New weather widget! Give it a try, it can display both current weather in selected city and weather forecast.</li>
                        <li>Two new themes.</li>
                        <li>Option to automatically switch to compact mode based on screen size.</li>
                        <li>We got rid of a few internal libraries and adjusted compilation settings, so extension files now take less space. This should make loading extension slightly faster (around 10%).</li>
                        <li>New option 'Show animation on open'.</li>
                    </ul>
                </section>
                <section>
                    <h2>1.1.0</h2>
                    <ul>
                        <li>Support for shortcuts across extension. Press <ShortcutHint shortcut='alt+h' /> to see them all!</li>
                        <li>Added compact mode</li>
                        <li>New 'Top sites' widget (Firefox & Chrome)</li>
                    </ul>
                </section>
            </div>
        </ScrollArea>
    </div>)
};