import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './en.json';
import esTranslation from './es.json';
import deTranslation from './de.json';
import frTranslation from './fr.json';
import ukTranslation from './uk.json';
import zhCnTranslation from './zh-cn.json';
import zhTwTranslation from './zh-tw.json';
import thTranslation from './th.json';
import { storage } from '@utils/storage';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/de';
import 'moment/locale/zh-cn';
// When uncommenting any of moment locales, don't forget to update webpack config to actually include them in build
// import 'moment/locale/es';
// import 'moment/locale/fr';
// import 'moment/locale/zh-tw';
moment.locale('en');

export const SHOW_LANGUAGE_SELECT_IN_SETTINGS = true;

// Not all translations are finished yet
// export const availableTranslations = ['en', 'es', 'de', 'fr', 'uk', 'zh-tw', 'zh-cn'] as const;

export const availableTranslations = ['en', 'de', 'uk', 'th', 'zh-CN'] as const;

export type Language = typeof availableTranslations[number];

export const availableTranslationsPrettyNames = {
    'en': 'English',
    'de': 'Deutsch',
    'uk': 'Українська',
    'th': 'ไทย',
    'zh-CN': '中文 (简体)',

    // 'es': 'Español',
    // 'fr': 'Français',
    // 'zh-tw': '中文 (繁體)',
} satisfies Record<Language, string>;

const resources = {
    en: enTranslation,
    de: deTranslation,
    uk: ukTranslation,
    th: thTranslation,
    'zh-CN': zhCnTranslation,

    // es: esTranslation,
    // fr: frTranslation,
    // 'zh-tw': zhTwanslation,
} satisfies Record<Language, any>;

export const initTranslation = async () => {
    const lang = await storage.getOne('language');
    moment.locale(lang);
    i18n.use(initReactI18next).init({
        debug: true,
        returnNull: false,
        fallbackLng: 'en',
        lng: lang || 'en',
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources,
    });
};

export const switchTranslationLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    moment.locale(lang.toLowerCase()); // Moment uses lowecase locales (e.g. zh-cn), but i18next requires them to be like zh-CN
};

export const translate = i18n.t;
