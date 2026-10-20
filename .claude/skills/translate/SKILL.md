---
name: translate
description: Translate Anori's UI strings from en.json into the other languages, one subagent per language. Fills missing and stale keys by default; --full retranslates whole files. Run only when the user invokes /translate.
argument-hint: "[lang ...] [--full]"
disable-model-invocation: true
---

# Translate Anori

Translates `src/translations/en.json` into the other languages. Each language is handled by its own subagent working from the whole language file, so terminology stays consistent; `translations-manager.ts` provides the bookkeeping (what's pending, validation, fingerprints).

Arguments: zero or more language codes (`de`, `pt-br`, …) and optionally `--full`.

- No `--full`: translate only **pending** keys (missing, or whose English changed since they were translated).
- `--full`: retranslate **every** key of the language from scratch, e.g. after its conventions changed or for an audit.
- No language codes: every language with pending keys; with `--full`, every language except `uk`.

`uk` is hand-verified by the user. Include it only when it's listed explicitly or has pending keys, and always tell the user which `uk` strings changed so they can check them.

Run every `pnpm` command below from the repo root with `-s`, so pnpm's banner doesn't end up in the output.

## 1. Collect the work

```sh
mkdir -p .harness/translate
pnpm -s translations:pending <lang> > .harness/translate/<lang>.json              # pending keys
pnpm -s translations:pending <lang> --all-keys > .harness/translate/<lang>.json   # --full
```

Run it once per language (or `pending all` to see which languages have work; it prints `{}` when nothing is pending). Each entry has the key, the English source (`en`), the current translation (`previous`), the key's note with term references already resolved and plural instructions added, and where the key is used in code. Skip languages with no keys and tell the user if there's nothing to do.

## 2. Translate, one subagent per language

Spawn one `general-purpose` subagent per language, **all in a single message** so they run in parallel. Each prompt:

> Translate Anori's UI strings into <Language name> (`<lang>`). Work from the repo root `<absolute repo path>`. Mode: **<pending | full>**. The keys to translate, with context, are in `.harness/translate/<lang>.json`. Follow `.claude/skills/translate/agent-brief.md` exactly, and report back in the format it asks for.

Add a line for anything you know about the language from this session or the user (a known bad term, feedback from a native speaker).

## 3. Check each language as its agent finishes

1. `pnpm -s translations:validate <lang>` — must print `✅`. If it lists problems, send them back to that agent with SendMessage, or fix small ones yourself.
2. Read the diff (`git diff src/translations/<lang>.json`). Spot-check a handful of changed strings against the English, and look for what models tend to get wrong: a gendered form describing the user, the wrong form of address, a term that contradicts the glossary, a dropped sentence, an added "ago" next to a relative-time placeholder.
   With `--full`, also spawn a separate review subagent per language: give it every changed string as English / previous / new and have it fix only strings where the new version is worse than the previous one or wrong (clumsy word order, stiffer phrasing, a dropped word, a less standard term), while keeping changes the rules require. Translators reliably miss these regressions themselves, and they don't show when reading the new file alone.
3. `pnpm -s translations:stamp <lang>` — rewrites the file in canonical key order, applies the language's typography fixes (e.g. French non-breaking spaces), and marks the pending keys as up to date. Never stamp a language whose agent didn't finish all of its pending keys.
4. Merge the agent's reported **glossary additions** into `src/translations/language-notes.json` → `<lang>.glossary` (concept → term, e.g. `"theme": "'tema'"`), and any proposed **rules** into `<lang>.rules`. Add new concepts; change an existing entry only when the agent explains why the old term was wrong. Do this yourself, one language at a time; subagents never write to `language-notes.json`, as parallel edits would clobber each other.

## 4. Report

Tell the user, per language: how many keys were translated, glossary entries added, and the judgment calls worth a native speaker's look (from the agent's report plus anything you noticed). Call out every changed `uk` string. Remind the user to run `pnpm translations:locales` if `appName`, `appDescription` or `appActionTitle` changed, since those feed the browser store listings.

Don't commit; the user reviews and commits.

## Notes

- New English strings need a note in `src/translations/notes.json` before translating (see `.ai/localization.md`). If a pending key has no note and its meaning is ambiguous, ask the user rather than guessing.
- Adding a new language is a separate setup step (see `.ai/localization.md`); after that, `/translate <lang>` fills it.
