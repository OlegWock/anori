import { ScrollArea } from './ScrollArea';
import { ShortcutHint } from './ShortcutHint';
import './WhatsNew.scss';
import { analyticsEnabledAtom } from '@utils/analytics';
import { Checkbox } from './Checkbox';
import { useAtomWithStorage } from '@utils/storage/api';
import { useTranslation } from 'react-i18next';
import vtuberLogo from '@assets/images/vtuber-logo-dark.svg';

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
                    <h2>1.19.0</h2>
                    <ul>
                        <li>Minor UI refactoring here and there.</li>
                        <li>Search plugin now supports Kagi.</li>
                        <li>I made a cute and simple vtuber-style logo for Anori :3</li>
                    </ul>
                    <div className="logo-wrapper">
                        <img src={vtuberLogo} alt="Anori logo" className="logo" />
                    </div>
                </section>

                <section>
                    <h2>1.18.0</h2>
                    <ul>
                        <li>
                            Added new Picture plugin to spring some ✨aesthetic✨ on your new tab.
                            This was contribution from @slayernominee. Thanks!
                        </li>
                        <li>
                            Added new Label plugin so you can better organize your widgets.
                            This was another contribution from @slayernominee. Thanks!
                        </li>
                        <li>
                            Now, after you navigated to another page from Anori and then clicked 'Back'
                            you will be taken to folder you navigated from rather than home/default folder.
                        </li>
                    </ul>
                </section>
                <section>
                    <h2>1.17.0</h2>
                    <ul>
                        <li>Custom themes are finally here! Now you can set custom background and select colors to your liking.</li>
                        <li><strong>Backup format was changed in this release, if you make backups you'll need to export fresh backup, as backups from older versions won't work.</strong></li>
                        <li>Fixed bugs here and there.</li>
                    </ul>
                    <div className='donation-callout'>
                        I recently set up Buy me a coffe and crypto wallets. So if you're enjoying Anori and would like
                        to support its development with some coin, you can find more
                        details <a href="https://sinja.io/support">here</a>.
                    </div>
                </section>
                <section>
                    <h2>1.16.2</h2>
                    <ul>
                        <li>Added option for compact view in RSS Feed widget.</li>
                        <li>Fixed some bugs. Probably added some other bugs.</li>
                    </ul>
                </section>

                <section>
                    <h2>1.16.0</h2>
                    <p>Added Brzilian Portuguese translation. This was contribution from @RenanSantos7. Thanks!</p>
                </section>

                <section>
                    <h2>1.15.0</h2>
                    <p>Added Arabic translation. This was contribution from @FouratiMohamed. Thanks!</p>
                    <p>
                        I don't have much experience adapting interfaces for right-to-left languages,
                        so if you spot any issues with that please <a href="https://github.com/OlegWock/anori/issues">let me know</a>!
                    </p>
                </section>

                <section>
                    <h2>1.14.0</h2>
                    <ul>
                        <li>Anori is now available in Spanish. This was contribution from @CaesaRR19. Thanks!</li>
                        <li>Added option to open bookmarks in a new tab. Contribution from @bil0ak. Thanks!</li>
                    </ul>
                </section>

                <section>
                    <h2>1.13.0</h2>
                    <ul>
                        <li>Embedded page widgets are now available on Firefox.</li>
                        <li>Added option to remember last open folder (Settings &gt; General).</li>
                    </ul>
                </section>

                <section>
                    <h2>1.12.0</h2>
                    <ul>
                        <li>Anori is now available in French. This was contribution from @AguilaDesign. Thanks!</li>
                        <li>
                            Expandable widgets introduced in previous release (like embedded page or calculator) now
                            can be detached and moved/resized. You can open multiple windows from different widgets (but
                            only one window per widget, yet).
                        </li>
                        <li>
                            Previous release was a bit buggy, sorry for that (especially for disappeared widgets)! This release fixes reported/found errors from previous release.
                        </li>
                        <li>Fixed bug with incorrect widgets size/inconsistent spacing between widgets on some screen sizes.</li>
                    </ul>
                </section>

                <section>
                    <h2>1.11.0</h2>
                    <p>There are a lot of changes in this release, so if you find any bugs please let me know by creating <a href="https://github.com/OlegWock/anori/issues">issue</a>!</p>
                    <ul>
                        <li>
                            Added new 'Embedded webpage' plugin. Now you can add your Notion Dashboard or your favorite Google Doc to Anori.
                            Or even have C̶̺͍̜̾͌͗͂͠h̸̨̛͌́̂a̷̢̝̔̈́͑͂̅͂̕t̸̡̛̫̖͔̘̺́ͅG̷̲͐́͌̍P̵̗̮̹̭͇̽̅̀͑͠T̵̖̗͓̼̖͍͑̅ (sorry!) here. Not available on Firefox (yet).
                        </li>
                        <li>
                            Also added new 'Math' plugin. There is currently only a calculator, but a powerful one! It uses math.js library under
                            the hood, which supports a lot
                            of <a href="https://mathjs.org/docs/reference/functions.html">functions</a>, <a href="https://mathjs.org/docs/reference/constants.html">constants</a> and <a href="https://mathjs.org/docs/datatypes/units.html#reference">units</a>.
                            And all this also works in command menu!
                        </li>
                        <li>Tasks, notes, RSS feed and recently closed tabs widgets now can be resized.</li>
                        <li>Now you can move widgets to another folder. Just drag them over folder you'd like to move them to and release mouse button. Poof!</li>
                        <li>Added option to monitor status (up/down) of a bookmark (you can find it on the widget configuration screen). Web developers and self-hosters, this one is for you!</li>
                        <li>
                            I decided to change how extension behaves when you resize window (or switch to smaller screen).
                            Previously, extension tried to reposition widgets which didn't fit and if that was impossible just hide them.
                            This behavior confused quite a lot of you and was also kinda prone to bugs. Now Anori just shows scrollbar in such case.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>1.10.0</h2>
                    <ul>
                        <li>Added option to display bookmarks bar, you can find it in Settings &gt; General. Currently, available only for Chrome and Edge</li>
                        <li>Anori is now available in Russian. This was contribution from @MLGRussianXP. Thanks!</li>
                        <li>And also Anori has an Italian translation now too. This was contribution from @Radeox. Thanks!</li>
                        <li>Minor fixes for Thai translation (contribution from @kiznick, thanks!)</li>
                        <li>Sidebar now adapts to window size and becomes horizontal on vertical screens. You can switch it back to always vertical in Settings &gt; General</li>
                    </ul>
                </section>

                <section>
                    <h2>1.9.0</h2>
                    <ul>
                        <li>Anori is now available in Thai. This was contribution from @kiznick. Thanks!</li>
                        <li>Anori is now available in Simplified Chinese. This was contribution from @TheSnowfield. Thanks!</li>
                        <li>
                            Added a <a href="https://anori.app/privacy" target="_blank">Privacy practices</a> page where
                            you can read in details which data Anori collects and other related info.
                        </li>
                    </ul>
                </section>

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
                        <li>Added Ukrainian translation. If you would like to help translating Anori into your language, check <a target="_blank" href="https://github.com/OlegWock/anori/issues/104">this</a>.</li>
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