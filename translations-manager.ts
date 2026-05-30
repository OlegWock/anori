import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import lodash from "lodash";
const { get, set } = lodash;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_LANGUAGE = "en";
const SECONDARY_REFERENCE = "uk";
const TRANSLATIONS_FOLDER = join(__dirname, "src/translations");
const SOURCE_FOLDER = join(__dirname, "src");
const FINGERPRINTS_FILE = join(TRANSLATIONS_FOLDER, "fingerprints.json");
const NOTES_FILE = join(TRANSLATIONS_FOLDER, "notes.json");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const BATCH_SIZE = 40;
const MAX_USAGES_PER_KEY = 3;

// Toggled by the -v/--verbose CLI flag; dumps raw model responses when parsing fails.
let verbose = false;

const FINISHED_TRANSLATIONS = [
  "en",
  "uk",
  "it",
  "de",
  "fr",
  "es",
  "th",
  "tr",
  "zh-cn",
  "ru",
  "ar",
  "pt-br",
  "ja",
  "vi",
  "pl",
  "sk",
  "cs",
  "id",
  "fil",
  "hi",
];

// English names of the languages, used in the translation prompt.
const LANGUAGE_ENGLISH_NAMES: Record<string, string> = {
  uk: "Ukrainian",
  de: "German",
  fr: "French",
  es: "Spanish",
  "pt-br": "Brazilian Portuguese",
  it: "Italian",
  th: "Thai",
  tr: "Turkish",
  "zh-cn": "Simplified Chinese",
  ru: "Russian",
  ar: "Arabic",
  ja: "Japanese",
  vi: "Vietnamese",
  pl: "Polish",
  sk: "Slovak",
  cs: "Czech",
  id: "Indonesian",
  fil: "Filipino",
  hi: "Hindi",
};

type Fingerprints = Record<string, Record<string, string>>;
// Flattened in memory; on disk `notes.json` is nested like the translation files (without
// the `translation` wrapper) so it can be hand-edited alongside `en.json`.
type Notes = Record<string, string>;
type Usage = { file: string; line: number; text: string };

const loadJsonFile = <T = Record<string, unknown>>(fname: string): T => {
  return JSON.parse(readFileSync(fname, "utf-8")) as T;
};

const saveJsonFile = (fname: string, obj: unknown) => {
  writeFileSync(fname, `${JSON.stringify(obj, null, 4)}\n`);
};

const loadOptionalJson = <T>(fname: string, fallback: T): T => {
  return existsSync(fname) ? loadJsonFile<T>(fname) : fallback;
};

const transformLocaleNameForChrome = (lang: string) => {
  if (lang.includes("-")) {
    const tokens = lang.split("-");
    tokens[1] = tokens[1].toUpperCase();
    return tokens.join("_");
  }
  return lang;
};

// Flattens the `translation` root of a translation file into dot-separated keys
// pointing at leaf strings (e.g. `cloud.connect`), matching how keys are used in code.
const flattenStrings = (obj: unknown, prefix = ""): Record<string, string> => {
  const result: Record<string, string> = {};
  if (typeof obj !== "object" || obj === null) return result;
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[path] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenStrings(value, path));
    }
  }
  return result;
};

const getTranslationRoot = (lang: string): Record<string, unknown> => {
  const file = loadJsonFile(join(TRANSLATIONS_FOLDER, `${lang}.json`));
  return (file.translation ?? {}) as Record<string, unknown>;
};

const fingerprint = (englishValue: string): string => {
  return createHash("sha256").update(englishValue).digest("hex").slice(0, 12);
};

const listLanguages = (): string[] => {
  return readdirSync(TRANSLATIONS_FOLDER)
    .filter((fn) => fn.endsWith(".json"))
    .map((fn) => fn.replace(".json", ""))
    .filter((name) => name !== "fingerprints" && name !== "notes");
};

// Maps every translation key to the places in `src` where it's referenced, so the
// model gets concrete usage context. Dynamically-built keys won't be matched.
const collectUsages = (): Map<string, Usage[]> => {
  const map = new Map<string, Usage[]>();
  const patterns = [
    /\bt\(\s*["'`]([\w.\-]+)["'`]/g,
    /\btranslate\(\s*["'`]([\w.\-]+)["'`]/g,
    /i18nKey=\s*["'`]([\w.\-]+)["'`]/g,
  ];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "translations") continue;
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const lines = readFileSync(full, "utf-8").split("\n");
        lines.forEach((text, idx) => {
          for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
            while ((match = pattern.exec(text)) !== null) {
              const key = match[1];
              const usages = map.get(key) ?? [];
              if (usages.length < MAX_USAGES_PER_KEY) {
                usages.push({ file: relative(__dirname, full), line: idx + 1, text: text.trim() });
              }
              map.set(key, usages);
            }
          }
        });
      }
    }
  };

  walk(SOURCE_FOLDER);
  return map;
};

// Returns the set of interpolation tokens that must survive translation:
// {{variables}}, <0>..</0> / <1/> trans tags, and $t(...) references.
const extractPlaceholders = (value: string): string[] => {
  const tokens = new Set<string>();
  for (const m of value.matchAll(/\{\{[^}]+\}\}/g)) tokens.add(m[0]);
  for (const m of value.matchAll(/<\/?\d+\s*\/?>/g)) tokens.add(m[0]);
  for (const m of value.matchAll(/\$t\([^)]+\)/g)) tokens.add(m[0]);
  return [...tokens].sort();
};

const placeholdersMatch = (english: string, translated: string): boolean => {
  const a = extractPlaceholders(english);
  const b = extractPlaceholders(translated);
  return a.length === b.length && a.every((token, i) => token === b[i]);
};

// Parses the model's delimited reply: each translation is introduced by a line `[[[<key>]]]`
// followed by its (possibly multi-line) text. Using markers instead of JSON sidesteps the
// frequent failure where models emit an unescaped quote inside a value and break the JSON.
const parseKeyedBlocks = (content: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const markerRe = /^\s*\[\[\[(.+?)\]\]\]\s*$/;
  let key: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (key !== null) result[key] = buffer.join("\n").trim();
  };
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(markerRe);
    if (match) {
      flush();
      key = match[1].trim();
      buffer = [];
    } else if (key !== null && !/^\s*```/.test(line)) {
      buffer.push(line);
    }
  }
  flush();
  return result;
};

type TranslationItem = { key: string; en: string; uk?: string; previous?: string; note?: string; usage?: string };

const callOpenRouter = async (languageName: string, items: TranslationItem[]): Promise<Record<string, string>> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY environment variable is not set.");
    process.exit(1);
  }
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const system = [
    `You are a professional software localization engine for Anori, a customizable browser new-tab extension.`,
    `Translate the given UI strings from English into ${languageName}.`,
    `Rules:`,
    `- Translate the "en" value. Use the "uk" (Ukrainian) value only as a secondary reference for meaning and tone.`,
    `- Words in quotes that name a UI element (a button, tab, folder, or menu label — e.g. 'Next', 'Home', 'Folders') refer to other parts of the app; translate them into the target language to match that label rather than leaving them in English. Keep only brand/product names (such as Anori) untranslated.`,
    `- If a "previous" value is given, it is an existing translation of an earlier, slightly different version of the English string. Keep its tone, terminology, and word choice, and adjust it to match the current "en" rather than translating from scratch.`,
    `- "note" and "usage" describe where the string appears; use them to pick the right wording, but never translate them.`,
    `- Preserve every interpolation placeholder EXACTLY: {{variables}}, numbered tags like <0>...</0> or <1/>, and $t(...) references. Never translate text inside {{ }} or tag contents.`,
    `- Mirror the source's trailing punctuation: if the English ends with an ellipsis ("..."), a colon, or other trailing punctuation, keep the same in the translation; if it doesn't, don't add any.`,
    `- Keep it concise and natural for UI, matching the punctuation and capitalization style of the source.`,
    `- For quotation marks use ONLY straight quotes — the apostrophe ' (U+0027) and the double quote " (U+0022). Never use typographic, curly, or angled quotes (such as “ ” ‘ ’ „ ‚ « » 「 」); replace any of them with the matching straight quote.`,
    `- Output ONLY the translations, nothing else — no JSON, no commentary, no code fences.`,
    `- For each item, write a line containing exactly [[[<key>]]] (using the item's "key"), then the translated text on the following line(s). Example:`,
    `[[[some.key]]]`,
    `Translated text for some.key`,
    `[[[another.key]]]`,
    `Translated text for another.key`,
  ].join("\n");

  const user = JSON.stringify(items, null, 2);

  if (verbose) {
    console.log(`  → requesting ${items.length} key(s): ${items.map((i) => i.key).join(", ")}`);
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response");

  const translations = parseKeyedBlocks(content);
  if (Object.keys(translations).length === 0) {
    if (verbose) console.error(`  ──── raw model response ────\n${content}\n  ──── end ────`);
    throw new Error(`no translations parsed from model response: ${content.slice(0, 200)}`);
  }
  return translations;
};

// Translates a batch, isolating failures: on a network or JSON-parse error the batch is
// split in half and retried, so one malformed key can't sink the others or the whole run.
const translateBatch = async (languageName: string, items: TranslationItem[]): Promise<Record<string, string>> => {
  try {
    return await callOpenRouter(languageName, items);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (items.length === 1) {
      console.warn(`  ⚠️  ${items[0].key}: translation failed (${message}); skipping.`);
      return {};
    }
    console.warn(`  ⚠️  batch of ${items.length} failed (${message}); splitting and retrying.`);
    const mid = Math.ceil(items.length / 2);
    const left = await translateBatch(languageName, items.slice(0, mid));
    const right = await translateBatch(languageName, items.slice(mid));
    return { ...left, ...right };
  }
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
};

// Determines which keys of a language are missing or stale relative to the English source.
const computeOutdated = (lang: string, enFlat: Record<string, string>, fingerprints: Fingerprints) => {
  const langFlat = flattenStrings(getTranslationRoot(lang));
  const langFingerprints = fingerprints[lang] ?? {};
  const missing: string[] = [];
  const stale: string[] = [];
  for (const [key, enValue] of Object.entries(enFlat)) {
    const expected = fingerprint(enValue);
    if (langFlat[key] === undefined) {
      missing.push(key);
    } else if (langFingerprints[key] !== expected) {
      stale.push(key);
    }
  }
  return { langFlat, missing, stale };
};

const translateLanguage = async (
  lang: string,
  enFlat: Record<string, string>,
  ukFlat: Record<string, string>,
  notes: Notes,
  usages: Map<string, Usage[]>,
  fingerprints: Fingerprints,
) => {
  const languageName = LANGUAGE_ENGLISH_NAMES[lang];
  if (!languageName) {
    console.error(`❌ No English name configured for language "${lang}". Add it to LANGUAGE_ENGLISH_NAMES.`);
    return;
  }

  const { langFlat, missing, stale } = computeOutdated(lang, enFlat, fingerprints);
  const outdated = [...missing, ...stale];
  if (outdated.length === 0) {
    console.log(`✅ ${lang}: already up to date.`);
    return;
  }
  console.log(`🌐 ${lang}: translating ${outdated.length} keys (${missing.length} missing, ${stale.length} stale)...`);

  const langFingerprints = fingerprints[lang] ?? {};
  let failures = 0;

  for (const batch of chunk(outdated, BATCH_SIZE)) {
    const items: TranslationItem[] = batch.map((key) => {
      const usage = (usages.get(key) ?? []).map((u) => `${u.file}:${u.line} — ${u.text}`).join("\n");
      return {
        key,
        en: enFlat[key],
        uk: lang === SECONDARY_REFERENCE ? undefined : ukFlat[key],
        previous: langFlat[key] || undefined,
        note: notes[key] || undefined,
        usage: usage || undefined,
      };
    });

    let result = await translateBatch(languageName, items);

    // Retry once for keys that came back with broken interpolation placeholders.
    const placeholderBroken = batch.filter(
      (key) => result[key] !== undefined && !placeholdersMatch(enFlat[key], result[key]),
    );
    if (placeholderBroken.length > 0) {
      const retryItems = items.filter((item) => placeholderBroken.includes(item.key));
      const retry = await translateBatch(languageName, retryItems);
      result = { ...result, ...retry };
    }

    for (const key of batch) {
      const value = result[key];
      if (value === undefined) {
        console.warn(`  ⚠️  ${key}: no translation returned, skipping.`);
        failures++;
        continue;
      }
      if (!placeholdersMatch(enFlat[key], value)) {
        console.warn(`  ⚠️  ${key}: placeholder mismatch, keeping previous value (will retry next run).`);
        failures++;
        continue;
      }
      langFlat[key] = value;
      langFingerprints[key] = fingerprint(enFlat[key]);
    }
  }

  fingerprints[lang] = langFingerprints;
  writeLanguageFile(lang, enFlat, langFlat);
  console.log(`✅ ${lang}: done${failures > 0 ? ` (${failures} keys failed)` : ""}.`);
};

// Rebuilds a language file following the key order of English, keeping only keys that
// still exist in the source and dropping the rest. Preserves existing/hand-edited values.
const writeLanguageFile = (lang: string, enFlat: Record<string, string>, langFlat: Record<string, string>) => {
  const translation: Record<string, unknown> = {};
  for (const key of Object.keys(enFlat)) {
    const value = langFlat[key];
    if (value !== undefined) set(translation, key, value);
  }
  saveJsonFile(join(TRANSLATIONS_FOLDER, `${lang}.json`), { translation });
};

const main = async () => {
  const args = process.argv.slice(2).filter((arg) => {
    if (arg === "-v" || arg === "--verbose") {
      verbose = true;
      return false;
    }
    return true;
  });
  const command = args[0];

  const enFlat = flattenStrings(getTranslationRoot(DEFAULT_LANGUAGE));
  const targetLanguages = listLanguages().filter((lang) => lang !== DEFAULT_LANGUAGE);

  if (command === "status") {
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    for (const lang of targetLanguages) {
      const { missing, stale } = computeOutdated(lang, enFlat, fingerprints);
      const total = Object.keys(enFlat).length;
      const ok = total - missing.length - stale.length;
      const mark = missing.length === 0 && stale.length === 0 ? "✅" : "⚠️ ";
      console.log(
        `${mark} ${lang.padEnd(6)} ${ok}/${total} up to date — ${missing.length} missing, ${stale.length} stale`,
      );
    }
  } else if (command === "translate") {
    const requested = args[1];
    if (!requested) {
      console.error("❌ Specify a language or 'all': pnpm translations:translate <lang|all>");
      process.exit(1);
    }
    const langs = requested === "all" ? targetLanguages : [requested];
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    const notes = flattenStrings(loadOptionalJson(NOTES_FILE, {}));
    const ukFlat = flattenStrings(getTranslationRoot(SECONDARY_REFERENCE));
    const usages = collectUsages();

    for (const lang of langs) {
      await translateLanguage(lang, enFlat, ukFlat, notes, usages, fingerprints);
      saveJsonFile(FINGERPRINTS_FILE, fingerprints);
    }
  } else if (command === "remove-excessive") {
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    for (const lang of targetLanguages) {
      const langFlat = flattenStrings(getTranslationRoot(lang));
      const excessive = Object.keys(langFlat).filter((key) => enFlat[key] === undefined);
      if (excessive.length === 0) continue;
      console.log(`Removing ${excessive.length} excessive keys from ${lang}`);
      for (const key of excessive) {
        delete langFlat[key];
        if (fingerprints[lang]) delete fingerprints[lang][key];
      }
      writeLanguageFile(lang, enFlat, langFlat);
    }
    saveJsonFile(FINGERPRINTS_FILE, fingerprints);
  } else if (command === "generate-locales") {
    console.log("Generating locales for", FINISHED_TRANSLATIONS.join(", "));
    const localesKeysToTranslationKeys = [
      ["appName.message", "translation.appName"],
      ["appDescription.message", "translation.appDescription"],
      ["appActionTitle.message", "translation.appActionTitle"],
    ];

    FINISHED_TRANSLATIONS.forEach((lang) => {
      const correctedLang = transformLocaleNameForChrome(lang);
      const original = loadJsonFile(join(TRANSLATIONS_FOLDER, `${lang}.json`));
      if (!existsSync(join(SOURCE_FOLDER, `_locales/${correctedLang}`))) {
        mkdirSync(join(SOURCE_FOLDER, `_locales/${correctedLang}`));
      }
      const data = localesKeysToTranslationKeys.reduce<Record<string, unknown>>((obj, [lk, tk]) => {
        return set(obj, lk, get(original, tk));
      }, {});
      saveJsonFile(join(SOURCE_FOLDER, `_locales/${correctedLang}/messages.json`), data);
    });
  } else {
    console.error(`Unknown command: ${command}`);
    console.error("Available: status, translate <lang|all>, remove-excessive, generate-locales");
    process.exit(1);
  }
};

main();
