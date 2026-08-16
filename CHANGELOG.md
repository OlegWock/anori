# Changelog

## 2.1.0

- **New.** Tab stash widget. Use it to store the links you mean to get back to later, and keep them on your new tab so you'll actually remember them. A tab can be stashed from the widget itself or from the new Anori popup window — just click the Anori icon in the extension's toolbar. With Anori Plus your stash is shared across every browser you're signed into, and across all profiles.
- **New.** Synced tabs widget. See what's open on your other devices, and effortlessly pick up where you left off on a previous device. Requires Anori Plus and an explicit opt-in in settings.
- **New.** Clicking the Anori icon in the toolbar now opens a popup instead of just opening a new tab.
- **New.** Settings gained a Devices section, where you can see everything signed into your Anori Plus account, and rename or remove it.
- **Improved.** The Recently closed tabs widget was folded into a new Tabs plugin alongside the two widgets above, and it can now be resized taller than before.
- **Improved.** Tasks, Notes, RSS feed, Weather forecast and Recently closed tabs now share one header layout, so their titles and buttons line up side by side.
- **Improved.** Anori Plus now opens as a section in Settings rather than its own modal, next to your devices and profiles.
- **Improved.** Translated languages now use correct plural forms, instead of borrowing English's one-or-many rule.
- **Improved.** The What's new screen was redesigned, and notes for older versions moved out of the extension into this changelog.
- **Improved.** Config sync and synced tabs now share a single realtime connection instead of opening one each.
- **Fixed.** Background images stay centered when you resize the browser window, instead of being cropped from the right and bottom.
- **Fixed.** On Firefox, the permission prompt is no longer left hidden behind the toolbar popup.

## 2.0.2

Second follow-up to big 2.0 release with improvements to appearance and custom themes.

- Removed translucent plate behind widgets. Widgets now have more space to occupy.
- Custom themes now have a lightness control which enables more granular control over appearance.
- Custom themes can now hide the dot pattern in the background.
- Updates and bug fixes for widgets organization and resizing system.
- Minor tweaks and bug fixes for custom theme editor.

## 2.0.1

- Fixed 'Just give me a productive setup' doing nothing on click.
- Minor bug fixes.

## 2.0.0

- Anori has a new look! I tried not to stray too far from the established visual identity, but I finally had a chance to polish all the rough edges. I hope you'll like it.
- Theming was reworked. Now you can switch between light and dark modes for each theme, including your custom ones.
- To create a custom theme you now need to only select one color and Anori will derrive whole palette from it. This should make it easier to create your own themes as well as make generated colors more coherent. You existing custom themes were migrated automatically.
- Performance improvements.
- Bug fixes, of course!

## 1.27.0

- Picture widget can now display local images from your device, not just remote URLs.
- Calendar widget now supports Hijri, Persian, Hebrew, and Buddhist calendars.
- Added Vietnamese translation. This was contribution from @itsccao. Thanks!
- Translation system was reworked. From now on, new strings will be machine translated into target languages rather than kept in English. Translation might not be perfect, so if you notice a mistake or awkward wording, you're very welcome to [help fix it](https://github.com/OlegWock/anori/issues/104).
- Added Polish, Slovak, Czech, Indonesian, Filipino, and Hindi (machine) translations. If you notice something off, please file an issue.
- Relaxed size limitation for embedded page, bookmark, and RSS widgets.

## 1.26.0

Couple of big ones in this release!

First of all, we're launching beta of Anori Plus — companion service for Anori. Currently, provides a realtime sync of your Anori setup between multiple browsers and devices. We plan to add other features later too. It's free while in beta, so give it a try, no credit card required. [Learn more about Anori Plus](https://anori.app/plus).

To power sync we had to significantly rework internals of Anori responsible for storage. This also affects backup format, as older backups won't be compatible with this version. **If you use backups you need to export fresh backup now.**

And last but not least, Anori now has a Japanese translation. This was contribution from @monta-gh. Thanks!

## 1.25.0

- New design of "Add widget" modal.
- Fixed some bugs.
- Added couple of new bugs probably.

## 1.24.0

- Top sites widget is now resizable.
- This is again a housekeeping release. I want to cleanup and polish existing features in Anori before adding any new ones.
- I removed some of the features: windowing system (e.g. for widgets like calculator and embedded page), command menu, focus stealer, option to hide edit folder button, label plugin. All of them were either very rarely used, or didn't feel right from product and/or design point of view.
- Significantly changed how icons are stored and loaded. All your existing icons should work as previosuly (let me know if something broke!), but now they are loaded directly from the icons service (we use [Iconify](https://iconify.design/), it's great). This allowed to significantly reduce size of the extension and provide even more icons than before at the same time.
- Bunch of bug fixes and optimization.
- If you enabled sending analytics, in addition to Posthog it will be now sent to Amplitude.

## 1.23.0

- This is a housekeeping release. A lot of refactoring, a bit of optimizations, bunch of bugfixes.
- Significant changes to analytics. As always, Anori doesn't send any analytics if you didn't enable it explicitly. And even then we don't track any sensetive data. You can read more [here](https://anori.app/privacy).

## 1.22.0

- Added partial Turkish translation. This was contribution from @AbdullahVC. Thanks!

## 1.21.0

- Happy New Year and thank you for choosing Anori in 2024 :)
- Unfortunately, I had to remove search widget from the Anori due to requirements from Google. I apologize for any inconvenience, but unfortunately there is not much I can do about it.
- Previously Anori would stop working if you had a lot of bookmarks in bookmarks bar widget. This was fixed in this version, now it can handle _really big_ number of bookmarks.
- Smaller fixes here and there.

## 1.20.0

- Tab groups now can be opened in new tab using middle mouse button click. This was contribution from @DarkVen0m. Thanks!
- Chinese translation was updated. This was contribution from @rockcor. Thanks!

## 1.19.0

- Added new Anki plugin to study your cards directly from Anori! This was contribution from @slayernominee. Thanks!
- Added option to hide sidebar (move your mouse to left/bottom edge to show it).
- Minor UI refactoring here and there.
- Search plugin now supports Kagi.
- I made a cute and simple vtuber-style logo for Anori :3

## 1.18.0

- Added new Picture plugin to sprinkle some ✨aesthetic✨ on your new tab. This was contribution from @slayernominee. Thanks!
- Added new Label plugin so you can better organize your widgets. This was another contribution from @slayernominee. Thanks!
- Now, after you navigated to another page from Anori and then clicked 'Back' you will be taken to folder you navigated from rather than home/default folder.

## 1.17.0

- Custom themes are finally here! Now you can set custom background and select colors to your liking.
- **Backup format was changed in this release, if you make backups you'll need to export fresh backup, as backups from older versions won't work.**
- Fixed bugs here and there.

I recently set up Buy me a coffe and crypto wallets. So if you're enjoying Anori and would like to support its development with some coin, you can find more details [here](https://sinja.io/support).

## 1.16.2

- Added option for compact view in RSS Feed widget.
- Fixed some bugs. Probably added some other bugs.

## 1.16.1

Fixed some bugs. Probably added some other bugs.

## 1.16.0

Added Brzilian Portuguese translation. This was contribution from @RenanSantos7. Thanks!

## 1.15.0

Added Arabic translation. This was contribution from @FouratiMohamed. Thanks!

I don't have much experience adapting interfaces for right-to-left languages, so if you spot any issues with that please [let me know](https://github.com/OlegWock/anori/issues)!

## 1.14.0

- Anori is now available in Spanish. This was contribution from @CaesaRR19. Thanks!
- Added option to open bookmarks in a new tab. Contribution from @bil0ak. Thanks!

## 1.13.0

- Embedded page widgets are now available on Firefox.
- Added option to remember last open folder (Settings > General).

## 1.12.0

- Anori is now available in French. This was contribution from @AguilaDesign. Thanks!
- Expandable widgets introduced in previous release (like embedded page or calculator) now can be detached and moved/resized. You can open multiple windows from different widgets (but only one window per widget, yet).
- Previous release was a bit buggy, sorry for that (especially for disappeared widgets)! This release fixes reported/found errors from previous release.
- Fixed bug with incorrect widgets size/inconsistent spacing between widgets on some screen sizes.

## 1.11.0

There are a lot of changes in this release, so if you find any bugs please let me know by creating [issue](https://github.com/OlegWock/anori/issues)!

- Added new 'Embedded webpage' plugin. Now you can add your Notion Dashboard or your favorite Google Doc to Anori. Or even have ChatGPT (sorry!) here. Not available on Firefox (yet).
- Also added new 'Math' plugin. There is currently only a calculator, but a powerful one! It uses math.js library under the hood, which supports a lot of [functions](https://mathjs.org/docs/reference/functions.html), [constants](https://mathjs.org/docs/reference/constants.html) and [units](https://mathjs.org/docs/datatypes/units.html#reference). And all this also works in command menu!
- Tasks, notes, RSS feed and recently closed tabs widgets now can be resized.
- Now you can move widgets to another folder. Just drag them over folder you'd like to move them to and release mouse button. Poof!
- Added option to monitor status (up/down) of a bookmark (you can find it on the widget configuration screen). Web developers and self-hosters, this one is for you!
- I decided to change how extension behaves when you resize window (or switch to smaller screen). Previously, extension tried to reposition widgets which didn't fit and if that was impossible just hide them. This behavior confused quite a lot of you and was also kinda prone to bugs. Now Anori just shows scrollbar in such case.

## 1.10.0

- Added option to display bookmarks bar, you can find it in Settings > General. Currently, available only for Chrome and Edge
- Anori is now available in Russian. This was contribution from @MLGRussianXP. Thanks!
- And also Anori has an Italian translation now too. This was contribution from @Radeox. Thanks!
- Minor fixes for Thai translation (contribution from @kiznick, thanks!)
- Sidebar now adapts to window size and becomes horizontal on vertical screens. You can switch it back to always vertical in Settings > General

## 1.9.0

- Anori is now available in Thai. This was contribution from @kiznick. Thanks!
- Anori is now available in Simplified Chinese. This was contribution from @TheSnowfield. Thanks!
- Added a [Privacy practices](https://anori.app/privacy) page where you can read in details which data Anori collects and other related info.

## 1.8.0

- Anori is now available in German. This was contribution from @berndviehboeck. Thanks!
- Fixed a couple of bugs with notes widget.

## 1.7.0

- New RSS plguin. It includes two widgets: one to display latest post from RSS feed and one to show posts from multiple feeds in one timeline.
- Added Ecosia as search provider to Internet search widget. Contribution from @Radeox. Thanks!
- Settings grown to be quite lengthy for single modal, so in this version they got reorganized into separate screens. And we have two new options: to hide "Edit folder" button and to change page title.
- I changed font used in the extension (Quicksand → Nunito). Old font doesn't support Cyrillic and I plan to double down on translating the extension into other languages, so it was a deal-breaker. I also tweaked styles a bit so text should be more readable now. I hope you'll like new font!
- Added Ukrainian translation. If you would like to help translating Anori into your language, check [this](https://github.com/OlegWock/anori/issues/104).
- New big datetime widget!
- New bookmark group widget!
- Notes widget now supports markdown.
- Now you can select screen width threshold for Anori to switch to compact mode.

## 1.6.0

Recently, Anori got a lot of traction on tiki-toki app, and I'd like to use this opportunity to welcome new users. I hope you get yourself comfortable with Anori. In this version, I addressed some bugs and inconveniences you reported, now you can:

- Open Anori tab by clicking on extension icon in top right corner (especially useful for Opera users).
- Reorder tasks in ToDo widget.
- Import bookmark from browser (when adding new bookmark to folder).

I also added analytics to better understand which functions you use the most and which aren't used. Analytics is opt-in, so Anori won't send any data if you don't enable analytics. And even when enabled, extension doesn't send any private info. All it collect is: how much folders you have, which widgets you use, which theme you use, how many custom icons you have, how often you use keyboard shortcuts. Anori doesn't send name of your folder, or URL of bookmarks, or content of your notes.

I kindly ask you to enable this feature, as it will help me to develop better product. You can always change your choice in settings.

## 1.5.0

Huge news! Now you can upload your own icons and use them for folders or bookmarks. Anori supports jpg, gif, png and svg. You can upload your first icon in settings. And here are a few cool icon packs for your inspiration, enjoy!

- [Cute stylized app icons](https://www.svgrepo.com/collection/stylized-app-icons/)
- [Landscapes](https://www.svgrepo.com/collection/landscape-circled-vectors/)
- [Animals](https://www.svgrepo.com/collection/animal-sticker-stamp-vectors/)
- [Traveling flat icons](https://www.pngrepo.com/collection/traveling-flat-icons/)

This feature uses a kinda experimental API which support only recently landed in Firefox, so if you don't see 'Custom icons' section in settings, make sure you're using at least Firefox 111. Chrome users should be fine as is.

**Please note.** To support custom icons in backups, format of backups also changed (now it's zip which includes your custom icons). So if you use this feature you might want to export a fresh backup.

## 1.4.0

- Recently closed tabs widget now presented in two sizes for dear folks with smaller screens <3.
- You can now select first day of a week in calendar widget.

## 1.3.0

- Now you can search in all icon sets at once (I don't believe I added this only now lol).
- Icon picker now doesn't go beyond screen edge on smaller screens.

## 1.2.0

- New weather widget! Give it a try, it can display both current weather in selected city and weather forecast.
- Two new themes.
- Option to automatically switch to compact mode based on screen size.
- We got rid of a few internal libraries and adjusted compilation settings, so extension files now take less space. This should make loading extension slightly faster (around 10%).
- New option 'Show animation on open'.

## 1.1.0

- Support for shortcuts across extension. Press `Alt+H` to see them all!
- Added compact mode
- New 'Top sites' widget (Firefox & Chrome)
