# Localization

* Anori supports multiple languages.

* We use `i18next` and `react-i18next` libraries for translations.

* When translating string in context of React component, use `useTranslation` hook from `react-i18next`. It returns object which contains function `t` which can be invoked with nested string key (e.g. `onboarding.presets.title`) and returns translated string.

* When translating string outside of React components, use function `translate` from `@anori/translations/utils`, it has same signature as `t` from `useTranslation`.

* Translation files for those languages are located in `src/translations`.

* `src/translations/metadata.ts` holds the list of available translations (codes, pretty names, text direction, resources). `src/translations/utils.ts` holds the i18next setup and the `translate` helper.

* `en` is the only source of truth and the only language that is never auto-translated. `uk` is also hand-verified and trusted, and serves as a secondary reference when translating the other languages. It can still be translated like any other target language, but the user reviews every `uk` change.

* Other languages are translated with the **`/translate` Claude Code skill** (`.claude/skills/translate/`): one subagent per language, each working from the whole language file so terminology stays consistent, with `translations-manager.ts` doing the bookkeeping. The results are committed to source control and freely hand-editable. `/translate` fills missing and stale keys; `/translate <lang> --full` retranslates a whole language.

* When adding a new language: create an empty `src/translations/<lang>.json` (`{ "translation": {} }`); register it in `src/translations/metadata.ts` (translation import, `moment/locale/<lang>` import, `availableTranslations`, `availableTranslationsPrettyNames`, `resources`, `languageDirections`); add it to `MomentLocalesPlugin.localesToKeep` in `rspack.config.ts`; and add it to `FINISHED_TRANSLATIONS` and `LANGUAGE_ENGLISH_NAMES` in `translations-manager.ts`. Add an entry for it to `src/translations/language-notes.json` (form of address, button verb form, glossary of core terms). Then the user runs `/translate <lang>` to fill it.

* Authoring `en` strings: keep quotation marks straight (`'` and `"`) — the translator is steered to avoid typographic/curly quotes. To reference another UI label inside a string (a button, tab, or folder name), use i18next nesting `$t(key)` in the `en` source (e.g. `click '$t(next)'`) instead of hardcoding the label, so it resolves to each language's own translation. `$t(...)` is treated as a placeholder and preserved verbatim during machine translation.

* `$t(key)` only works where the label is quoted and grammatically inert — a button name the user clicks, or a product name that is identical in every language. It is **wrong** for a feature mentioned as part of a sentence, because it injects the nominative form: `settings.title` is "Налаштування", but Ukrainian prose needs "в налаштування", "до налаштувань", "в налаштуваннях" depending on the case. For those, leave the `en` string as plain prose and steer the translator with a term reference in `notes.json` (below) so the wording stays consistent without being frozen.

* `src/translations/fingerprints.json` stores, per language per key, a hash of the `en` value the translation was derived from. A key is (re)translated only when its hash is missing or no longer matches the current `en` value — this is what makes translation incremental and lets hand-edits survive until the English source changes (at which point they are overwritten by a fresh translation, by design). Origin (machine vs. hand-edited) is never tracked.

* `src/translations/notes.json` holds optional human-readable usage notes that are fed to the model as extra context. It is nested like the translation files (but without the `translation` wrapper) so notes can be hand-edited alongside `en.json`. It is hand-maintained (seed it for existing keys with the help of Claude Code; add notes for new keys manually). Missing notes are fine — the translator also auto-greps `src` for `t('key')` usages as fallback context.

* `.ai/translation-rules.md` holds the rules that apply to every language (keep the meaning whole, glossary terms, consistent form of address, gender-neutral phrasing about the user, keep the developer's "I" singular, sentence case, length, placeholders, straight quotes, plural forms, mock content). The `/translate` agents follow it.

* `src/translations/language-notes.json` holds per-language conventions: `{ "<lang>": { "rules": [...], "glossary": { "<concept>": "'<term>' (optional comment)" } } }`. `rules` covers the form of address (T/V), gender-neutral phrasing, button verb form, typography and regional variant. `glossary` fixes one term per recurring concept (widget, folder, tab, bookmark, plugin, extension, theme, stash, …). They override the general rules and existing wording. Native-speaker feedback that isn't tied to a single key goes here, and `/translate` adds the terms its agents establish to the glossary. Like term references, conventions are context only: editing them does **not** mark existing translations stale. Fix the language file by hand, or have the user run `/translate <lang> --full`.

* **Notes for plural keys go on the root key, never on the individual forms.** For `daysLeft_one` / `daysLeft_other`, write one note under `daysLeft`, not one per form; the translator falls back from each form to its root, and a single note keeps every form (including the extra ones other languages need, like `_few` and `_many`) on the same context. Say in the note that the string uses i18next plural forms and, if there is more than one number in it, which one (`{{count}}`) picks the form. See `tabs-plugin.stash.tabCount`.

* **Term references in notes.** A note may contain `$(some.key)`, which the translator replaces with that key's **current translation in the target language** before sending the item to the model. Use it whenever a string mentions a feature, screen, or widget that has its own key, so every language keeps one name for it:

    ```jsonc
    // notes.json
    "minorTabsPlugin": "Minor change entry: … Established terms: Recently closed tabs = '$(recently-closed-plugin.name)', the Tabs plugin = '$(tabs-plugin.name)'."
    ```

    For `uk` the model then receives `Established terms: Recently closed tabs = 'Нещодавно закриті вкладки', the Tabs plugin = 'Вкладки'.` `translation-rules.md` tells it to reuse that exact term for the feature but to inflect it (case, number, gender, articles, prepositions) so the sentence stays grammatical — matching terminology matters, pasting the term unchanged at the cost of grammar does not.

    Details worth knowing:
    * `$(...)` is deliberately **not** i18next's `$t(...)`: it lives only in `notes.json`, never in a translation file, and is not subject to placeholder validation.
    * If a referenced key has no translation in that language yet, its `en` value is substituted. If it doesn't exist in `en` at all, `translations:pending` warns — that's a typo in `notes.json`.
    * The reference is context, not a dependency: changing a term's `en` value does **not** mark the strings that cite it stale. Retranslate them by hand when a term is renamed.

* Helper commands (all implemented in `translations-manager.ts`; run with `pnpm -s` when you need clean output):
    * `pnpm translations:status [--strict]` — prints, per language, how many keys are up to date / missing / stale. Writes nothing. `--strict` (CI's `translations:check`) also validates every file and exits non-zero on any problem.
    * `pnpm translations:pending <lang|all> [--all-keys]` — prints the missing and stale keys per language as JSON: the English source, the current translation, the key's note with term references resolved and plural instructions added, and its usages in code. `--all-keys` lists every key, for full retranslations.
    * `pnpm translations:validate <lang|all>` — checks a language file: every expected key present (including the language's CLDR plural forms), no unexpected keys, placeholders matching the English, no typographic quotes, no leaked key markers.
    * `pnpm translations:stamp <lang|all>` — after a language's pending keys have been translated: validates the file, rewrites it in canonical key order with the language's typography fixes (e.g. French non-breaking spaces before `: ; ? !`), and marks the pending keys up to date in `fingerprints.json`. It refuses to stamp an invalid file.
    * `pnpm translations:clean` — removes keys no longer found in `en` from other translations (and from `fingerprints.json`). Run after removing strings from `en`.
    * `pnpm translations:locales` — generates files in `src/_locales` folder. Those are used by browser and extension stores to show extension name and description in preferred user language. They shouldn't be edited manually.

* **Agents: never translate on your own.** Add or change `en` strings (and `notes.json` entries) and stop there; the user runs `/translate` when they decide to. It rewrites many files, and while the harness watcher is running each write triggers a rebuild. Only translate when the user explicitly asks in that conversation.

* General flow when working with translations is as follows
    * When adding new strings:
        1. Add them to `en` translation.
        2. Add usage notes for the new keys to `notes.json`. If a string names a feature that has its own key, cite it with `$(that.key)` in the note.
        3. The user runs `/translate` (not you, unless explicitly asked).
    * When removing strings
        1. Remove them from `en` translation.
        2. Run `pnpm translations:clean`
    * When changing strings
        1. Update string(s) in `en`. The changed fingerprint marks them stale automatically.
        2. The user runs `/translate` to refresh every language.
    * To correct a single bad translation, just edit the value in the language file directly — it will persist until that `en` string changes.
