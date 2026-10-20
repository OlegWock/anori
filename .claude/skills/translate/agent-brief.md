# Brief: translate Anori into one language

You translate the UI strings of Anori — a browser extension that lets users compose their own new-tab page from widgets — from English into one language. Your prompt gives the language, the mode, and the path to a JSON file with the keys to translate.

## Read first

1. `.ai/translation-rules.md` — the rules for every language. Binding.
2. `src/translations/language-notes.json` → your language's entry: `rules` (form of address, style, typography, regional variant) and `glossary` (concept → established term). Binding; they override the general rules where they conflict.
3. `src/translations/<lang>.json` — the whole current translation file, even in pending mode. It shows the terms and tone already in use; new strings must match them.
4. The keys file from your prompt. Per key:
   - `en`: the English source to translate.
   - `previous`: the current translation, if any.
   - `note`: context about where and how the string appears, with plural-form instructions for plural keys. `$(...)` term references are already resolved to your language's current term.
   - `usage`: where the key is used in code.

Also available:
- `src/translations/en.json`: the English source as a whole.
- `src/translations/uk.json`: hand-verified Ukrainian, useful when the English is ambiguous.
- `grep -rn "<key>" src`: to see a string in its component.

## Mode

- **pending**: translate only the keys listed in the keys file. `previous`, when present, is a translation of an older version of the English. Keep its wording and terminology where they still fit, and change what the new English requires. Leave every other key in the file untouched.
- **full**: translate every key listed (all of them) from the English. Treat `previous` as a weak reference only: it may be inconsistent or wrong. Before writing, decide one term for each recurring concept (widget, folder, tab, new tab, bookmark, plugin, keyboard shortcut, extension, settings, theme, icon, permission, stash/stashed tabs (stash is not save), RSS preset, the onboarding's ready-made setup, feed, post, sync, profile, device, edit mode, add, remove, delete, …). Start from the glossary, and use those terms everywhere.

## Writing the file

- Edit `src/translations/<lang>.json` in place. It is nested JSON under `{ "translation": { ... } }`, and keys like `cloud.devices.title` are nested objects. Keep 4-space indentation and literal UTF-8 (no `\u` escapes), and escape `"` inside values as `\"`.
- A missing key goes into its parent object. Key order doesn't matter, because the orchestrator normalizes it afterwards.
- Plural keys must be exactly the CLDR categories your language uses (`_one`, `_few`, …). The keys file lists the ones you need.
- Don't add, remove or rename any other key, and don't touch any other file. Don't run `pnpm translations:stamp` or any git command.

## Check your work

1. Run `pnpm -s translations:validate <lang>` from the repo root. It must print `✅ <lang>: valid`. If it doesn't, fix what it reports and rerun.
2. Re-read every string you wrote, top to bottom. Check:
   - every glossary term and every recurring concept is consistent;
   - the form of address is right everywhere;
   - no gendered forms describe the user;
   - grammar and spelling are correct;
   - nothing was dropped from the English.

   Fix what you find.

## Report back

Keep it concise:

1. **Validation:** the output of `translations:validate`.
2. **Counts:** how many keys you translated.
3. **Glossary additions:** terms you established that the glossary doesn't have yet, as a JSON object in a fenced block, concept → term, in the glossary's style:
   ```json
   { "theme": "'tema'", "to stash a tab": "'apartar' (Tab stash = 'Pestañas apartadas'; never 'guardar', which is Save)" }
   ```
   Include a concept only if it recurs or is likely to recur. If you think an existing glossary entry is wrong, say so separately and explain why; don't silently use a different term.
4. **Rule suggestions** (optional): a language-wide convention you followed that isn't written down yet, e.g. "avoid attaching suffixes to placeholders".
5. **Judgment calls:** strings you weren't sure about, or where you departed from a literal translation, with the key and a short reason.
