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

const transformLocaleNameForChrome = (lang: string) => {
    if (lang.includes('-')) {
        const tokens = lang.split('-');
        tokens[1] = tokens[1].toUpperCase();
        return tokens.join('_');
    }
    return lang;
}

const main = async () => {
    const args = process.argv.slice(2);
    const translationFiles = readdirSync(TRANSLATIONS_FOLDER).filter(fn => fn.endsWith('.json'));
    const translations = translationFiles.map(fn => fn.replace('.json', '')).filter(fn => !fn.endsWith('-missing'));
    console.log('Found translation files', translations.join(', '));

    const defaultTranslation = loadJsonFile(join(TRANSLATIONS_FOLDER, `${DEFAULT_LANGUAGE}.json`));
    const defaultKeys = objectDeepKeys(defaultTranslation).filter(k => k !== 'translation');

    const results: Record<string, { missing: string[] }> = {};
    translations.filter(t => t !== DEFAULT_LANGUAGE).forEach(lang => {
        const data = loadJsonFile(join(TRANSLATIONS_FOLDER, `${lang}.json`));
        const keys = objectDeepKeys(data).filter(k => k !== 'translation');
        const missingKeys = defaultKeys.filter(k => !keys.includes(k));

        results[lang] = {
            missing: missingKeys,
        }
    });

    if (args[0] === 'check-missing') {
        console.log('Checking for keys missing in lang-missing.json files.');

        let exitWithError = false;
        Object.entries(results).forEach(([lang, result]) => {
            if (result.missing.length === 0) {
                console.log(`✅ Language ${lang} all good!`);
            } else {
                if (!existsSync(join(TRANSLATIONS_FOLDER, `${lang}-missing.json`))) {
                    console.log(`❌ Language ${lang} has missing keys, but doesn't have ${lang}-missing.json file`);
                    exitWithError = true;
                    return;
                }
                const missingFile = loadJsonFile(join(TRANSLATIONS_FOLDER, `${lang}-missing.json`));
                const notAllMissingKeysInFile = result.missing.some(k => get(missingFile, k) === undefined);
                if (notAllMissingKeysInFile) {
                    console.log(`❌ Language ${lang} has missing keys which aren't found in ${lang}-missing.json file`);
                    exitWithError = true;
                } else {
                    console.log(`✅ Language ${lang} all good!`);
                }
            }
        });
        if (exitWithError) {
            console.log('🚨 Problems with files were detected, run `yarn translations:extract` to fix them.')
            process.exit(1);
        }
    } else if (args[0] === 'extract-untranslated') {
        Object.entries(results).filter(([lang, { missing }]) => missing.length !== 0).forEach(([lang, { missing }]) => {
            console.log('Extracting missing strings from', lang);
            const newData = {};

            missing.forEach(key => {
                const defaultValue = get(defaultTranslation, key);
                set(newData, key, defaultValue);
            });
            saveJsonFile(join(TRANSLATIONS_FOLDER, `${lang}-missing.json`), newData);
        });
    } else if (args[0] === 'merge-back') {
        const langToMerge = args[1];
        if (!langToMerge) {
            console.log('❌ Specify which language file to merge: yarn translations:merge <lang>');
            process.exit(1);
            return;
        }
        const filesToMerge = translationFiles.filter(fn => fn === `${langToMerge}-missing.json`);
        console.log('Going to merge', filesToMerge.join(', '));
        filesToMerge.forEach(mergeFilename => {
            const lang = mergeFilename.replace('-missing.json', '');
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
        console.log('Generating locales for', FINISHED_TRANSLATIONS.join(', '));
        const localesKeysToTranslationKeys = [
            ['appName.message', 'translation.appName'],
            ['appDescription.message', 'translation.appDescription'],
            ['appActionTitle.message', 'translation.appActionTitle'],
        ];

        FINISHED_TRANSLATIONS.forEach(lang => {
            const correctedLang = transformLocaleNameForChrome(lang);
            const filename = join(TRANSLATIONS_FOLDER, `${lang}.json`);
            const original = loadJsonFile(filename);
            if (!existsSync(join(__dirname, `src/_locales/${correctedLang}`))) {
                mkdirSync(join(__dirname, `src/_locales/${correctedLang}`));
            }
            const data = localesKeysToTranslationKeys.reduce((obj, [lk, tk]) => {
                return set(obj, lk, get(original, tk));
            }, {});
            saveJsonFile(join(__dirname, `src/_locales/${correctedLang}/messages.json`), data)
        });
    } else {
        console.error('Unknown command', args[0]);
    }
};

const DEFAULT_LANGUAGE = 'en';
const TRANSLATIONS_FOLDER = join(__dirname, 'src/translations');
const FINISHED_TRANSLATIONS = ['en', 'uk', 'de', 'th', 'zh-cn', 'ru'];

main();