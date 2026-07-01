# Localization

* Anori supports multiple languages. 

* We use `i18next` and `react-i18next` libraries for translations.

* When translating string in context of React component, use `useTranslation` hook from `react-i18next`. It returns object which contains function `t` which can be invoked with nested string key (e.g. `onboarding.presets.title`) and returns translated string.

* When translating string outside of React components, use function `translate` from `@anori/translations/utils`, it has same signature as `t` from `useTranslation`.

* Translation files for those languages are located in `src/translations`.

* `src/translations/metadata.ts` holds the list of available translations (codes, pretty names, text direction, resources). `src/translations/utils.ts` holds the i18next setup and the `translate` helper.

* `en` is the only source of truth and the only language that is never auto-translated. `uk` is also hand-verified and trusted, and is passed to the model as a secondary reference when translating the other languages — but it is itself auto-translatable like any other target language.

* Other languages are translated by an LLM (via OpenRouter) and committed to source control, then freely hand-editable.

* When adding a new language: create an empty `src/translations/<lang>.json` (`{ "translation": {} }`); register it in `src/translations/metadata.ts` (translation import, `moment/locale/<lang>` import, `availableTranslations`, `availableTranslationsPrettyNames`, `resources`, `languageDirections`); add it to `MomentLocalesPlugin.localesToKeep` in `rspack.config.ts`; and add it to `FINISHED_TRANSLATIONS` and `LANGUAGE_ENGLISH_NAMES` in `translations-manager.ts`. Then run `pnpm translations:translate <lang>` to fill it.

* Authoring `en` strings: keep quotation marks straight (`'` and `"`) — the translator is steered to avoid typographic/curly quotes. To reference another UI label inside a string (a button, tab, or folder name), use i18next nesting `$t(key)` in the `en` source (e.g. `click '$t(next)'`) instead of hardcoding the label, so it resolves to each language's own translation. `$t(...)` is treated as a placeholder and preserved verbatim during machine translation.

* `src/translations/fingerprints.json` stores, per language per key, a hash of the `en` value the translation was derived from. A key is (re)translated only when its hash is missing or no longer matches the current `en` value — this is what makes translation incremental and lets hand-edits survive until the English source changes (at which point they are overwritten by a fresh translation, by design). Origin (machine vs. hand-edited) is never tracked.

* `src/translations/notes.json` holds optional human-readable usage notes that are fed to the model as extra context. It is nested like the translation files (but without the `translation` wrapper) so notes can be hand-edited alongside `en.json`. It is hand-maintained (seed it for existing keys with the help of Claude Code; add notes for new keys manually). Missing notes are fine — the translator also auto-greps `src` for `t('key')` usages as fallback context.

* Helper commands (all implemented in `translations-manager.ts`):
    * `pnpm translations:status` — prints, per language, how many keys are up to date / missing / stale. Writes nothing.
    * `pnpm translations:translate <lang-code|all>` — translates every missing-or-stale key for the given language (or all languages) via OpenRouter, validates that interpolation placeholders survive, writes the results, and updates `fingerprints.json`. A key whose placeholders don't survive keeps its previous value and stays stale for the next run. Requires `OPENROUTER_API_KEY` in the environment; the model is `OPENROUTER_MODEL` or a sensible default. Add `-v` for verbose output (dumps the raw model response on a parse failure).
    * `pnpm translations:clean` — removes keys no longer found in `en` from other translations (and from `fingerprints.json`). Run after removing strings from `en`.
    * `pnpm translations:locales` — generates files in `src/_locales` folder. Those are used by browser and extension stores to show extension name and description in preferred user language. They shouldn't be edited manually.

* General flow when working with translations is as follows
    * When adding new strings:
        1. Add them to `en` translation.
        2. Add usage notes for the new keys to `notes.json`.
        3. Run `pnpm translations:translate all`.
    * When removing strings
        1. Remove them from `en` translation.
        2. Run `pnpm translations:clean`
    * When changing strings
        1. Update string(s) in `en`. The changed fingerprint marks them stale automatically.
        2. Run `pnpm translations:translate all` to refresh every language.
    * To correct a single bad translation, just edit the value in the language file directly — it will persist until that `en` string changes.
