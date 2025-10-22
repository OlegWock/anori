![Anori](header.png)
---

# Features

* Add widgets to homepage and organize them however you want
* Use bookmarks, calendar, todo, notes and other useful widgets
* Organize them in folders
* Choose from 8 different color schemes and backgrounds
* Supports Chrome and Firefox
* Easily extend app with your own widgets

<details>
    <summary>Screenshot</summary>

![screenshot](screenshot.png)
</details>

<details>
    <summary>Widgets list</summary>

* Bookmarks & bookmark groups
* World time
* Weather
* Notes
* Tasks
* Calculator
* Embedded page
* RSS reader
* Calendar
* Anori integration
* Pictures
* Recently closed tabs (only Chrome & Firefox)
* Top sites (only Chrome & Firefox)
* CPU and RAM load (only Chrome)
</details>

# Installation

* If you use Chrome or any browser based on Chromium → install extension from [Chrome Web Store](https://chrome.google.com/webstore/detail/anori/ddeaekifelikgnaacipabpmjpffgifek)
* If you use Firefox → install extension from [Firefox Browser Add-ons](https://addons.mozilla.org/en-US/firefox/addon/anori/)

# Support development

You can support development of Anori with small donation, more info [here](https://sinja.io/support). Crypto and credit card options are available.

# Contributing

Currently, only pull requests for bug fixes and translations are accepted. If you want to add a new feature, please create an issue describing your idea first. Feature requests or proposals should not be submitted as pull requests; instead, open an issue to discuss your suggestion.

# Building from sources

To build extension from sources, you need, first of all, install dependencies:

```
pnpm install
```

To compile extension you can use either `dev` or `production` command with optional suffix:

```
pnpm dev # Development Chrome
pnpm dev:ff # Development version for Firefox
```

Compiled code will be placed under `dist` folder.

To install extension from disk refer to instructions for [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) and [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing).

For easier development, there is also `watch` command which will compile changes as you code:

```
pnpm watch
pnpm watch:ff
```

# License

Source code prior and including commit [1449a1c3effcc62e088f706e839c003e69e555b9](https://github.com/OlegWock/anori/tree/1449a1c3effcc62e088f706e839c003e69e555b9) was distributed under MIT license. Now license is AGPL, you can find full text [here](https://github.com/OlegWock/anori/blob/master/LICENSE).