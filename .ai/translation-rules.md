# Translation rules

Rules for translating Anori's UI strings from English (`src/translations/en.json`, the only source of truth) into another language. They apply to every language; the language's own entry in `src/translations/language-notes.json` adds its form of address, style rules and glossary, and overrides anything here it conflicts with.

- Translate the meaning of the whole English string. Don't shorten it, drop sentences, or add information that isn't there.
- Use the language's glossary terms for every concept the glossary lists, in every string, inflected as the sentence requires. For a recurring concept the glossary doesn't cover, pick one term and use it consistently across the whole file.
- When a key's note gives an established term (written there as `$(some.key)`, meaning "this language's translation of `some.key`"), reuse that exact term for the same feature, inflected as the sentence requires. Matching the terminology matters; pasting it unchanged at the cost of grammar does not.
- Address the user the same way in every string, using the form of address from the language's rules.
- Avoid phrasing that assigns the user a gender where the language marks it (gendered adjectives, participles or past-tense forms describing the user, e.g. "tired of choosing?", "you're ready", "grateful"). Rephrase naturally — present tense, impersonal forms, nouns. Never use slash or inclusive-writing forms ("ready/a", "prêt·e").
- Keep the speaker as in the English. "I" / "me" / "my" is the app's solo developer speaking personally: keep it first person singular, never turn it into "we". "We" / "us" stays plural.
- Use sentence case: capitalize only the first word and whatever the language's grammar requires (proper nouns, brand names, German nouns). Never carry over English Title Case.
- Keep it concise and natural for UI. Where reasonably possible, keep buttons, labels and other short strings close to the English length, as they sit in fixed-width UI.
- Follow the language's own convention for button and menu labels (infinitive, imperative, or noun), as its rules state.
- Words in quotes that name a UI element (a button, tab, folder, or menu label — e.g. 'Next', 'Home', 'Folders') refer to other parts of the app; translate them to match that label rather than leaving them in English.
- Keep brand and product names untranslated and in Latin script: Anori, Anori Plus, GitHub, AnkiConnect, Open-Meteo, Reddit, Gmail, Twitter.
- Preserve every interpolation placeholder exactly: `{{variables}}`, numbered tags like `<0>...</0>` or `<1/>` (translate the text inside tags, keep the tags), and `$t(...)` references. Never translate text inside `{{ }}`.
- Mirror the English trailing punctuation: if the English ends with an ellipsis ("..."), a colon, or other trailing punctuation, keep the same; if it doesn't, don't add any.
- For quotation marks use only straight quotes — `'` (U+0027) and `"` (U+0022). Never typographic, curly, angled or CJK quotes (“ ” ‘ ’ „ ‚ « » 「 」).
- Plural keys (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`) follow the language's CLDR plural categories. English has only `one`/`other`; for any other category translate from the English `other` form and produce the grammatically correct form for that category. If the string contains `{{count}}`, keep it; if it doesn't, the number is shown separately next to it and the string must agree with it.
- Mock and example content (example tasks, notes, RSS example posts, countdown titles) is user-facing: make it read naturally and relatably for native speakers, keeping its tone (including deadpan humour).
- A key's note and its usage in code are context only — never translate them, and never copy punctuation from a code excerpt into the translation.
