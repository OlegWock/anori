import { ScrollArea } from './ScrollArea';
import { ShortcutHint } from './ShortcutHint';
import './WhatsNew.scss';
import { analyticsEnabledAtom } from '@utils/analytics';
import { Checkbox } from './Checkbox';
import { useAtomWithStorage } from '@utils/storage';
import { useTranslation } from 'react-i18next';

export const WhatsNew = () => {
    const [analyticsEnabled, setAnalyticsEnabled] = useAtomWithStorage(analyticsEnabledAtom);
    const { t, i18n } = useTranslation();
    return (<div className="WhatsNew">
        <ScrollArea className='WhatsNew-scrollarea'>
            <div className='WhatsNew-content'>
                {i18n.language !== 'en' && <section>
                    {t('availableOnlyInEnglish')}
                </section>}

                <section>
                    <h2>1.8.0</h2>
                    <ul>
                        <li>Anori is now available in German. This was contribution from @berndviehboeck. Thanks!</li>
                        <li>Fixed a couple of bugs with notes widget.</li>
                    </ul>
                </section>

                <section>
                    <h2>1.7.0</h2>
                    <ul>
                        <li>New RSS plguin. It includes two widgets: one to display latest post from RSS feed and one to show posts from multiple feeds in one timeline.</li>
                        <li>Added Ecosia as search provider to Internet search widget. Contribution from @Radeox. Thanks!</li>
                        <li>
                            Settings grown to be quite lengthy for single modal, so in this version they got reorganized
                            into separate screens. And we have two new options: to hide "Edit folder" button and to
                            change page title.
                        </li>
                        <li>
                            I changed font used in the extension (Quicksand → Nunito). Old font doesn't support 
                            Cyrillic and I plan to double down on translating the extension into other languages, so
                            it was a deal-breaker. I also tweaked styles a bit so text should be more readable now.
                            I hope you'll like new font!
                        </li>
                        <li>Added Ukrainian translation. If you would like to help translating Anori into your language, check <a target="_blank" href="https://github.com/OlegWock/anori/issues/37#issuecomment-1579050787">this</a>.</li>
                        <li>New big datetime widget!</li>
                        <li>New bookmark group widget!</li>
                        <li>Notes widget now supports markdown.</li>
                        <li>Now you can select screen width threshold for Anori to switch to compact mode.</li>
                    </ul>
                </section>

                <section>
                    <h2>1.6.0</h2>
                    <p>
                        Recently, Anori got a lot of traction on tiki-toki app, and I'd like to use this opportunity to
                        welcome new users. I hope you get yourself comfortable with Anori. In this version, I addressed
                        some bugs and inconveniences you reported, now you can:
                    </p>
                    <ul className='margin-top'>
                        <li>
                            Open Anori tab by clicking on extension icon in top right
                            corner (especially useful for Opera users).
                        </li>
                        <li>
                            Reorder tasks in ToDo widget.
                        </li>
                        <li>
                            Import bookmark from browser (when adding new bookmark to folder).
                        </li>
                    </ul>

                    <p>
                        I also added analytics to better understand which functions you use the most and which aren't
                        used. Analytics is opt-in, so Anori won't send any data if you don't enable analytics. And
                        even when enabled, extension doesn't send any private info. All it collect is: how much folders
                        you have, which widgets you use, which theme you use, how many custom icons you have, how often
                        you use keyboard shortcuts. Anori doesn't send name of your folder, or URL of bookmarks, or
                        content of your notes.
                    </p>

                    <p>
                        I kindly ask you to enable this feature, as it will help me to develop better product.
                        You can always change your choice in settings.
                    </p>

                    <Checkbox className="analytics-checkbox" checked={analyticsEnabled} onChange={setAnalyticsEnabled}>Enable sending analytics</Checkbox>
                </section>
                <section>
                    <h2>1.5.0</h2>
                    <p>
                        Huge news! Now you can upload your own icons and use them for folders or bookmarks.
                        Anori supports jpg, gif, png and svg. You can upload your first icon in settings. And here
                        are a few cool icon packs for your inspiration, enjoy!
                    </p>
                    <ul>
                        <li><a target="_blank" href='https://www.svgrepo.com/collection/stylized-app-icons/'>Cute stylized app icons</a></li>
                        <li><a target="_blank" href='https://www.svgrepo.com/collection/landscape-circled-vectors/'>Landscapes</a></li>
                        <li><a target="_blank" href='https://www.svgrepo.com/collection/animal-sticker-stamp-vectors/'>Animals</a></li>
                        <li><a target="_blank" href='https://www.pngrepo.com/collection/traveling-flat-icons/'>Traveling flat icons</a></li>
                    </ul>
                    <p>
                        This feature uses a kinda experimental API which support only recently landed in Firefox, so if
                        you don't see 'Custom icons' section in settings, make sure you're using at least Firefox 111.
                        Chrome users should be fine as is.
                    </p>

                    <p>
                        <strong>Please note.</strong> To support custom icons in backups, format of backups also changed
                        (now it's zip which includes your custom icons). So if you use this feature you might
                        want to export a fresh backup.
                    </p>
                </section>
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