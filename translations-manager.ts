import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import lodash from "lodash";

const { get, set } = lodash;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_LANGUAGE = "en";
const TRANSLATIONS_FOLDER = join(__dirname, "src/translations");
const SOURCE_FOLDER = join(__dirname, "src");
const FINGERPRINTS_FILE = join(TRANSLATIONS_FOLDER, "fingerprints.json");
const NOTES_FILE = join(TRANSLATIONS_FOLDER, "notes.json");

const MAX_USAGES_PER_KEY = 3;

// Toggled by the --strict CLI flag; makes `status` exit non-zero when any key is missing or stale (for CI).
let strict = false;
let allKeys = false;

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

// English names of the languages, used in the `pending` output and plural-form notes.
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

const TYPOGRAPHY_FIXES: Record<string, (value: string) => string> = {
  fr: (value) => value.replace(/ ([:;?!])/g, "\u00a0$1"),
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
    .filter((name) => name !== "fingerprints" && name !== "notes" && name !== "language-notes");
};

// Maps every translation key to the places in `src` where it's referenced, so the
// model gets concrete usage context. Dynamically-built keys won't be matched.
const collectUsages = (): Map<string, Usage[]> => {
  const map = new Map<string, Usage[]>();
  const patterns = [
    /\bt\(\s*["'`]([\w.-]+)["'`]/g,
    /\btranslate\(\s*["'`]([\w.-]+)["'`]/g,
    /i18nKey=\s*["'`]([\w.-]+)["'`]/g,
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

const describePlaceholders = (tokens: string[]): string => (tokens.length === 0 ? "none" : tokens.join(" "));

const placeholdersMatch = (english: string, translated: string): boolean => {
  const a = extractPlaceholders(english);
  const b = extractPlaceholders(translated);
  return a.length === b.length && a.every((token, i) => token === b[i]);
};

type KeyContext = { key: string; en: string; previous?: string; note?: string; usage?: string };

const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;
type PluralCategory = (typeof PLURAL_CATEGORIES)[number];
const PLURAL_SUFFIX_RE = /_(zero|one|two|few|many|other)$/;

const toBcp47 = (lang: string): string => {
  const [base, region] = lang.split("-");
  return region ? `${base}-${region.toUpperCase()}` : base;
};

const pluralCategoriesForLanguage = (lang: string): PluralCategory[] => {
  const available = new Set<string>(new Intl.PluralRules(toBcp47(lang)).resolvedOptions().pluralCategories);
  return PLURAL_CATEGORIES.filter((category) => available.has(category));
};

const exampleCountsForCategory = (lang: string, category: PluralCategory): number[] => {
  const rules = new Intl.PluralRules(toBcp47(lang));
  const examples: number[] = [];
  for (let n = 0; n <= 120 && examples.length < 5; n++) {
    if (rules.select(n) === category) examples.push(n);
  }
  return examples;
};

const pluralBaseOf = (key: string): string => {
  const match = key.match(PLURAL_SUFFIX_RE);
  return match ? key.slice(0, -match[0].length) : key;
};

const findPluralBases = (enFlat: Record<string, string>): Map<string, Set<PluralCategory>> => {
  const groups = new Map<string, Set<PluralCategory>>();
  for (const key of Object.keys(enFlat)) {
    const match = key.match(PLURAL_SUFFIX_RE);
    if (!match) continue;
    const base = key.slice(0, -match[0].length);
    const categories = groups.get(base) ?? new Set<PluralCategory>();
    categories.add(match[1] as PluralCategory);
    groups.set(base, categories);
  }
  const bases = new Map<string, Set<PluralCategory>>();
  for (const [base, categories] of groups) {
    if (categories.has("other") && categories.size > 1) bases.set(base, categories);
  }
  return bases;
};

const englishSourceCategory = (target: PluralCategory, available: Set<PluralCategory>): PluralCategory => {
  if (available.has(target)) return target;
  if ((target === "one" || target === "zero" || target === "two") && available.has("one")) return "one";
  if (available.has("other")) return "other";
  return [...available][0] ?? "other";
};

type ExpectedKey = { key: string; enKey: string; category?: PluralCategory };

const buildExpectedKeys = (lang: string, enFlat: Record<string, string>): ExpectedKey[] => {
  const pluralBases = findPluralBases(enFlat);
  const targetCategories = pluralCategoriesForLanguage(lang);
  const emittedBases = new Set<string>();
  const expected: ExpectedKey[] = [];
  for (const key of Object.keys(enFlat)) {
    const base = pluralBases.has(pluralBaseOf(key)) ? pluralBaseOf(key) : null;
    if (base) {
      if (emittedBases.has(base)) continue;
      emittedBases.add(base);
      const available = pluralBases.get(base) as Set<PluralCategory>;
      for (const category of targetCategories) {
        expected.push({
          key: `${base}_${category}`,
          enKey: `${base}_${englishSourceCategory(category, available)}`,
          category,
        });
      }
    } else {
      expected.push({ key, enKey: key });
    }
  }
  return expected;
};

const pluralNote = (
  lang: string,
  category: PluralCategory,
  baseNote: string | undefined,
  enValue: string | undefined,
): string => {
  const examples = exampleCountsForCategory(lang, category);
  const examplesText = examples.length > 0 ? ` (used for counts like ${examples.join(", ")})` : "";
  const countHandling = /\{\{count\}\}/.test(enValue ?? "")
    ? "keeping {{count}}"
    : "agreeing with that number; the number itself is shown separately and is not part of this string";
  const instruction =
    `This is the CLDR "${category}" plural form for {{count}}${examplesText}. English has only "one"/"other"; ` +
    `produce the grammatically correct "${category}" form for ${LANGUAGE_ENGLISH_NAMES[lang]}, ${countHandling}.`;
  return baseNote ? `${baseNote} ${instruction}` : instruction;
};

// Determines which keys of a language are missing or stale relative to the English source.
const computeOutdated = (
  lang: string,
  expectedKeys: ExpectedKey[],
  enFlat: Record<string, string>,
  fingerprints: Fingerprints,
) => {
  const langFlat = flattenStrings(getTranslationRoot(lang));
  const langFingerprints = fingerprints[lang] ?? {};
  const missing: ExpectedKey[] = [];
  const stale: ExpectedKey[] = [];
  for (const expected of expectedKeys) {
    const expectedFingerprint = fingerprint(enFlat[expected.enKey]);
    if (langFlat[expected.key] === undefined) {
      missing.push(expected);
    } else if (langFingerprints[expected.key] !== expectedFingerprint) {
      stale.push(expected);
    }
  }
  return { langFlat, missing, stale };
};

const TERM_REFERENCE_RE = /\$\(([\w.-]+)\)/g;

// Resolves `$(some.key)` references in a note to that key's current translation in the
// target language.
const hydrateTermReferences = (
  note: string,
  langFlat: Record<string, string>,
  enFlat: Record<string, string>,
): string =>
  note.replace(TERM_REFERENCE_RE, (_full, key: string) => {
    const translated = langFlat[key];
    if (translated !== undefined) return translated;
    if (enFlat[key] === undefined) {
      console.warn(`  ⚠️  note references unknown key "${key}"; check notes.json.`);
      return key;
    }
    return enFlat[key];
  });

const describeKey = (
  lang: string,
  expected: ExpectedKey,
  enFlat: Record<string, string>,
  langFlat: Record<string, string>,
  notes: Notes,
  usages: Map<string, Usage[]>,
): KeyContext => {
  const baseNote = notes[expected.key] ?? notes[pluralBaseOf(expected.key)];
  const note = expected.category
    ? pluralNote(lang, expected.category, baseNote, enFlat[expected.enKey])
    : baseNote || undefined;
  const usageList = usages.get(expected.key) ?? usages.get(pluralBaseOf(expected.key)) ?? [];
  const usage = usageList.map((u) => `${u.file}:${u.line} — ${u.text}`).join("\n");
  return {
    key: expected.key,
    en: enFlat[expected.enKey],
    previous: langFlat[expected.key] || undefined,
    note: note ? hydrateTermReferences(note, langFlat, enFlat) : undefined,
    usage: usage || undefined,
  };
};

const CURLY_QUOTES_RE = /[“”‘’„‚«»「」『』]/;

const validateLanguage = (lang: string, enFlat: Record<string, string>): string[] => {
  const expectedKeys = buildExpectedKeys(lang, enFlat);
  const expectedSet = new Set(expectedKeys.map((expected) => expected.key));
  const langFlat = flattenStrings(getTranslationRoot(lang));
  const problems: string[] = [];
  for (const expected of expectedKeys) {
    const value = langFlat[expected.key];
    const english = enFlat[expected.enKey];
    if (value === undefined) {
      problems.push(`${expected.key}: missing`);
      continue;
    }
    if (value.trim() === "") problems.push(`${expected.key}: empty`);
    if (!placeholdersMatch(english, value)) {
      const wanted = describePlaceholders(extractPlaceholders(english));
      const got = describePlaceholders(extractPlaceholders(value));
      problems.push(`${expected.key}: placeholders differ — en has ${wanted}, translation has ${got}`);
    }
    if (value.includes("[[") && !english.includes("[[")) problems.push(`${expected.key}: contains a leaked key marker`);
    if (CURLY_QUOTES_RE.test(value) && !CURLY_QUOTES_RE.test(english)) {
      problems.push(`${expected.key}: uses typographic quotes; only ' and " are allowed`);
    }
  }
  for (const key of Object.keys(langFlat)) {
    if (!expectedSet.has(key))
      problems.push(`${key}: not expected for this language (removed from en, or a wrong plural form)`);
  }
  return problems;
};

// Rebuilds a language file following the language's expected key order, keeping only keys the
// language should have (its own plural forms included) and dropping the rest. Preserves existing values.
const writeLanguageFile = (lang: string, expectedKeys: ExpectedKey[], langFlat: Record<string, string>) => {
  const translation: Record<string, unknown> = {};
  for (const { key } of expectedKeys) {
    const value = langFlat[key];
    if (value !== undefined) set(translation, key, value);
  }
  saveJsonFile(join(TRANSLATIONS_FOLDER, `${lang}.json`), { translation });
};

const main = async () => {
  const args = process.argv.slice(2).filter((arg) => {
    if (arg === "--all-keys") {
      allKeys = true;
      return false;
    }
    if (arg === "--strict") {
      strict = true;
      return false;
    }
    return true;
  });
  const command = args[0];

  const enFlat = flattenStrings(getTranslationRoot(DEFAULT_LANGUAGE));
  const targetLanguages = listLanguages().filter((lang) => lang !== DEFAULT_LANGUAGE);
  const resolveLanguages = (requested: string | undefined): string[] => {
    if (!requested) {
      console.error(`❌ Specify a language or 'all': pnpm translations:${command} <lang|all>`);
      process.exit(1);
    }
    if (requested === "all") return targetLanguages;
    if (!targetLanguages.includes(requested)) {
      console.error(`❌ Unknown language "${requested}". Available: ${targetLanguages.join(", ")}`);
      process.exit(1);
    }
    return [requested];
  };

  if (command === "status") {
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    let hasIssues = false;
    for (const lang of targetLanguages) {
      const expectedKeys = buildExpectedKeys(lang, enFlat);
      const { missing, stale } = computeOutdated(lang, expectedKeys, enFlat, fingerprints);
      const total = expectedKeys.length;
      const ok = total - missing.length - stale.length;
      const mark = missing.length === 0 && stale.length === 0 ? "✅" : "⚠️ ";
      if (missing.length > 0 || stale.length > 0) hasIssues = true;
      console.log(
        `${mark} ${lang.padEnd(6)} ${ok}/${total} up to date — ${missing.length} missing, ${stale.length} stale`,
      );
      if (strict) {
        const problems = validateLanguage(lang, enFlat).filter((problem) => !problem.endsWith(": missing"));
        if (problems.length > 0) {
          hasIssues = true;
          console.log(problems.map((problem) => `     ❌ ${problem}`).join("\n"));
        }
      }
    }
    if (strict && hasIssues) {
      console.error("\n❌ Some translations are missing, stale, or invalid. Run /translate in Claude Code.");
      process.exit(1);
    }
  } else if (command === "pending") {
    const langs = resolveLanguages(args[1] ?? "all");
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    const notes = flattenStrings(loadOptionalJson(NOTES_FILE, {}));
    const usages = collectUsages();
    const pending: Record<string, { language: string; keys: KeyContext[] }> = {};
    for (const lang of langs) {
      const expectedKeys = buildExpectedKeys(lang, enFlat);
      const { langFlat, missing, stale } = computeOutdated(lang, expectedKeys, enFlat, fingerprints);
      const keys = allKeys ? expectedKeys : [...missing, ...stale];
      if (keys.length === 0) continue;
      pending[lang] = {
        language: LANGUAGE_ENGLISH_NAMES[lang] ?? lang,
        keys: keys.map((expected) => describeKey(lang, expected, enFlat, langFlat, notes, usages)),
      };
    }
    console.log(JSON.stringify(pending, null, 2));
  } else if (command === "validate") {
    let failed = false;
    for (const lang of resolveLanguages(args[1] ?? "all")) {
      const problems = validateLanguage(lang, enFlat);
      if (problems.length === 0) {
        console.log(`✅ ${lang}: valid`);
        continue;
      }
      failed = true;
      console.log(`❌ ${lang}: ${problems.length} problem(s)`);
      console.log(problems.map((problem) => `   ${problem}`).join("\n"));
    }
    if (failed) process.exit(1);
  } else if (command === "stamp") {
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    let failed = false;
    for (const lang of resolveLanguages(args[1])) {
      const problems = validateLanguage(lang, enFlat);
      if (problems.length > 0) {
        failed = true;
        console.log(`❌ ${lang}: not stamped, fix these first:`);
        console.log(problems.map((problem) => `   ${problem}`).join("\n"));
        continue;
      }
      const expectedKeys = buildExpectedKeys(lang, enFlat);
      const { langFlat, stale } = computeOutdated(lang, expectedKeys, enFlat, fingerprints);
      const typographyFix = TYPOGRAPHY_FIXES[lang];
      if (typographyFix) {
        for (const [key, value] of Object.entries(langFlat)) langFlat[key] = typographyFix(value);
      }
      writeLanguageFile(lang, expectedKeys, langFlat);
      const langFingerprints = fingerprints[lang] ?? {};
      for (const expected of stale) langFingerprints[expected.key] = fingerprint(enFlat[expected.enKey]);
      fingerprints[lang] = langFingerprints;
      console.log(`✅ ${lang}: normalized and marked ${stale.length} key(s) up to date`);
    }
    saveJsonFile(FINGERPRINTS_FILE, fingerprints);
    if (failed) process.exit(1);
  } else if (command === "remove-excessive") {
    const fingerprints = loadOptionalJson<Fingerprints>(FINGERPRINTS_FILE, {});
    for (const lang of targetLanguages) {
      const expectedKeys = buildExpectedKeys(lang, enFlat);
      const expectedSet = new Set(expectedKeys.map((expected) => expected.key));
      const langFlat = flattenStrings(getTranslationRoot(lang));
      const excessive = Object.keys(langFlat).filter((key) => !expectedSet.has(key));
      if (excessive.length === 0) continue;
      console.log(`Removing ${excessive.length} excessive keys from ${lang}`);
      for (const key of excessive) {
        delete langFlat[key];
        if (fingerprints[lang]) delete fingerprints[lang][key];
      }
      writeLanguageFile(lang, expectedKeys, langFlat);
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
    console.error(
      "Available: status [--strict], pending <lang|all> [--all-keys], validate <lang|all>, stamp <lang|all>, remove-excessive, generate-locales",
    );
    process.exit(1);
  }
};

main();
