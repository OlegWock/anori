- **Keep responses concise and purposeful.**
  Only provide information or code that directly helps solve the request.

- **Do not add filler or fluff.**
  Avoid phrases like _“You’re absolutely right”_, motivational comments, or unnecessary small talk.

- **Default to NO code comments.** This is a hard rule, not a preference — decorative comments are a recurring problem.
  Add a comment only when it is genuinely functional and the code cannot convey it on its own: a third-party quirk/workaround, a non-obvious "why" (a tricky algorithm, an unobvious invariant, a deliberate trick around a bug), a `biome-ignore`/`@ts-expect-error` justification, or a TODO. If it doesn't fall in one of those buckets, do not write it.
  Never restate what the code does, label a token/prop/variable/branch, narrate design rationale the names already convey, or reference the task/conversation/how the code used to be. Write for someone reading in 6 months with no memory of why it was written; when in doubt, leave it out and match the (usually zero) comment density of surrounding code.

- **End responses with precision.**
  If a closing note is needed, use short bullet points to summarize critical outcomes, decisions, or next steps—no long narrative recaps.

- **Stay task-focused.**
  Do not drift into explanations or elaborations unless directly requested.

# Project description

Current project name is Anori. It's browser extension (web extension) which enabled users to compose their own new page from provided widgets. Widgets are provided by plugins.

# Project structure and setup

* All code should be written in TypeScript, not JavaScript allowed.

* We use React for components.

* We use Panda CSS + a token-based design system for styling (no SCSS). See the Styling rules.

* Extension supports Chrome (Manifest V3) and Firefox (Manifest V2).

* Project is compiled with `rspack` which closely follows API of `webpack` and is compatible with most of webpack plugins.

* Project uses `pnpm`, use it to install dependencies or execute commands. Do not use `yarn` or `npm`.

* Useful commands
    * `pnpm fmt` — to format files
    * `pnpm typecheck` — to typecheck the whole project
    * `pnpm lint` — to lint (with autofix) the whole project
    * You don't need to run them manually every time. They are run as part of git hooks. Invoke only if asked by user.

* Main entry point are `src/pages/start.tsx` file which renders new tab page and `src/background.ts` which is responsible for background service worker/background page.

* Other files in `src` are split by folders
    * `_locales` — store generated locales for Chrome-like browsers. Those are generated automatically from locales stored in `translations` folder. See more in "Localization" section.
    * `assets` — store static non-code assets like images or fonts.
    * `components` — universal React components (and their styles) that can be used accross the app.
    * `pages` — folder with all pages available in the extension. Every file/folder in it is discovered and automatically compilled by rspack into separate output file.
    * `contentscripts` — similar to `pages`, this folder contains contentscripts that are automatically discovered and compiled by rspack.
    * `plugins` — contains all plugins available in the extension.
    * `scripts` — static code which shouldn't be compiled by rspack and instead if copied into dist as is. Should be JavaScrpt, not TypeScript.
    * `translations` — stores translations files. More in "Localization" section.
    * `utils` — catch-all folder for reusable code.

# Code patterns

* Use `assertValue(value, message?)` from `@anori/utils/asserts` instead of non-null assertions (`!`). It provides runtime validation while narrowing TypeScript types.

# Git

- Before doing any complex or dangerous operations with git branch (e.g. hard reset), make its backup.
