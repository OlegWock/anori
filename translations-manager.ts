import { join } from 'path';
import { writeFileSync, readFileSync, readdirSync, rmSync, existsSync, mkdirSync } from 'fs';
import { get, set } from 'lodash';

const objectDeepKeys = (obj: object): string[] => {
    return Object.keys(obj)
        // @ts-ignore I copied this from SO and don't know how to type it
        .filter(key => obj[key] instanceof Object)
        // @ts-ignore I copied this from SO and don't know how to type it
        .map(key => objectDeepKeys(obj[key]).map(k => `${key}.${k}`))
        .reduce((x, y) => x.concat(y), Object.keys(obj))
};

const loadJsonFile = (fname: string): object => {
    const raw = readFileSync(fname, 'utf-8');
    return JSON.parse(raw);
};

const saveJsonFile = (fname: string, obj: object) => {
    writeFileSync(fname, JSON.stringify(obj, null, 4));
};

const main = async () => {
    const args = process.argv.slice(2);
    const translationFiles = readdirSync(TRANSLATIONS_FOLDER).filter(fn => fn.endsWith('.json'));
    const translations = translationFiles.map(fn => fn.replace('.json', '')).filter(fn => !fn.endsWith('-extracted'));
    console.log('Found translation files', translations.join(', '));

    const defaultTranslation = loadJsonFile(join(TRANSLATIONS_FOLDER, `${DEFAULT_LANGUAGE}.json`));
    const defaultKeys = objectDeepKeys(defaultTranslation).filter(k => k !== 'translation');

    const results: Record<string, { missing: string[], untranslated: string[], excessive: string[] }> = {};
    translations.filter(t => t !== DEFAULT_LANGUAGE).forEach(lang => {
        const data = loadJsonFile(join(TRANSLATIONS_FOLDER, `${lang}.json`));
        const keys = objectDeepKeys(data).filter(k => k !== 'translation');
        const missingKeys = defaultKeys.filter(k => !keys.includes(k));
        const excessiveKeys = keys.filter(k => !defaultKeys.includes(k));
        const presentKeys = keys.filter(k => defaultKeys.includes(k));
        const untranslatedKeys = presentKeys.filter(k => {
            return get(defaultTranslation, k) === get(data, k);
        });

        results[lang] = {
            missing: missingKeys,
            excessive: excessiveKeys,
            untranslated: untranslatedKeys,
        }
    });

    if (args[0] === 'check-missing') {
        console.log('Checking for missing or untranslated strings.');

        let exitWithError = false;
        Object.entries(results).forEach(([lang, result]) => {
            if (result.missing.length === 0 && result.excessive.length === 0) {
                console.log(`✅ Language ${lang} all good!`);
            } else {
                console.log(`❌ Language ${lang} has ${result.missing.length} missing keys and ${result.excessive.length} excessive keys`);
                exitWithError = true;
            }
        });
        if (exitWithError) {
            process.exit(1);
        }
    } else if (args[0] === 'check-untranslated') {
        console.log('Checking for untranslated strings.');

        console.log('------------------------------')
        Object.entries(results).forEach(([lang, result]) => {
            if (result.untranslated.length === 0) {
                console.log(`✅ Language ${lang} all good!`);
            } else {
                console.log(`❌ Language ${lang} has ${result.untranslated.length} untranslated keys`);
            }
        });
    } else if (args[0] === 'add-missing') {
        Object.entries(results).filter(([lang, { missing }]) => missing.length !== 0).forEach(([lang, { untranslated, excessive }]) => {
            console.log('Adding missing strings to', lang);
            const fname = join(TRANSLATIONS_FOLDER, `${lang}.json`);
            const data = loadJsonFile(fname);
            const newData = {};

            [...defaultKeys, ...excessive].forEach(key => {
                const defaultValue = get(data, key) || get(defaultTranslation, key);
                set(newData, key, defaultValue);
            });
            saveJsonFile(fname, newData);
        });
    } else if (args[0] === 'extract-untranslated') {
        Object.entries(results).filter(([lang, { untranslated }]) => untranslated.length !== 0).forEach(([lang, { untranslated }]) => {
            console.log('Extracting untranslated strings from', lang);
            const newData = {};

            untranslated.forEach(key => {
                const defaultValue = get(defaultTranslation, key);
                set(newData, key, defaultValue);
            });
            saveJsonFile(join(TRANSLATIONS_FOLDER, `${lang}-extracted.json`), newData);
        });
    } else if (args[0] === 'merge-back') {
        const filesToMerge = translationFiles.filter(fn => fn.endsWith('-extracted.json'));
        console.log('Going to merge', filesToMerge.join(', '));
        filesToMerge.forEach(mergeFilename => {
            const lang = mergeFilename.replace('-extracted.json', '');
            const filename = join(TRANSLATIONS_FOLDER, `${lang}.json`);
            const original = loadJsonFile(filename);
            const toMerge = loadJsonFile(join(TRANSLATIONS_FOLDER, mergeFilename));
            const keysToMerge = objectDeepKeys(toMerge).filter(k => typeof get(toMerge, k) === 'string');
            keysToMerge.forEach(k => {
                set(original, k, get(toMerge, k));
            });
            saveJsonFile(filename, original);
            console.log('Merged', lang);
            rmSync(join(TRANSLATIONS_FOLDER, mergeFilename));
        });
    } else if (args[0] === 'generate-locales') {
        const FINISHED_TRANSLATIONS = ['en', 'uk', 'de'];
        console.log('Generating locales for', FINISHED_TRANSLATIONS.join(', '));
        const localesKeysToTranslationKeys = [
            ['appName.message', 'translation.appName'],
            ['appDescription.message', 'translation.appDescription'],
            ['appActionTitle.message', 'translation.appActionTitle'],
        ];

        FINISHED_TRANSLATIONS.forEach(lang => {
            const filename = join(TRANSLATIONS_FOLDER, `${lang}.json`);
            const original = loadJsonFile(filename);
            if (!existsSync(join(__dirname, `src/_locales/${lang}`))) {
                mkdirSync(join(__dirname, `src/_locales/${lang}`));
            }
            const data = localesKeysToTranslationKeys.reduce((obj, [lk, tk]) => {
                return set(obj, lk, get(original, tk));
            }, {});
            saveJsonFile(join(__dirname, `src/_locales/${lang}/messages.json`), data)
        });
    } else {
        console.error('Unknown command', args[0]);
    }
};

const DEFAULT_LANGUAGE = 'en';
const TRANSLATIONS_FOLDER = join(__dirname, 'src/translations');

main();