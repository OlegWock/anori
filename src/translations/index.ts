import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './en.json';
import deTranslation from './de.json';
import frTranslation from './fr.json';
import esTranslation from './es.json';
import itTranslation from './it.json';
import ukTranslation from './uk.json';
import zhCnTranslation from './zh-cn.json';
import thTranslation from './th.json';
import ruTranslation from './ru.json';
import arTranslation from './ar.json';
import ptBrTranslation from './pt-br.json';
import { storage } from '@utils/storage/api';
import moment from 'moment';
// When adding any of moment locales, don't forget to update webpack config to actually include them in build
import 'moment/locale/uk';
import 'moment/locale/de';
import 'moment/locale/fr';
import 'moment/locale/es';
import 'moment/locale/ru';
import 'moment/locale/th';
import 'moment/locale/it';
import 'moment/locale/ar';
import 'moment/locale/zh-cn';
import 'moment/locale/pt-br';
moment.locale('en');

export const SHOW_LANGUAGE_SELECT_IN_SETTINGS = true;

export const availableTranslations = ['en', 'de', 'fr', 'es', 'pt-BR', 'it', 'uk', 'th', 'zh-CN', 'ru', 'ar'] as const;

export type Language = typeof availableTranslations[number];

export const availableTranslationsPrettyNames = {
    'en': 'English',
    'de': 'Deutsch',
    'fr': 'Français',
    'it': 'Italiano',
    'uk': 'Українська',
    'th': 'ไทย',
    'zh-CN': '中文 (简体)',
    'ru': 'Русский',
    'es': 'Español',
    'ar': 'العربية',
    'pt-BR': 'Português do Brasil',
    // 'zh-TW': '中文 (繁體)',
} satisfies Record<Language, string>;

const resources = {
    en: enTranslation,
    de: deTranslation,
    fr: frTranslation,
    es: esTranslation,
    it: itTranslation,
    uk: ukTranslation,
    th: thTranslation,
    'zh-CN': zhCnTranslation,
    ru: ruTranslation,
    ar: arTranslation,
    'pt-BR': ptBrTranslation,
} satisfies Record<Language, any>;

export const languageDirections = {
    en: 'ltr',
    de: 'ltr',
    fr: 'ltr',
    es: 'ltr',
    it: 'ltr',
    uk: 'ltr',
    th: 'ltr',
    'zh-CN': 'ltr',
    ru: 'ltr',
    'pt-BR': 'ltr',
    ar: 'rtl',
} satisfies Record<Language, 'rtl' | 'ltr'>;

export const initTranslation = async () => {
    const lang = await storage.getOne('language') || 'en';
    const html = document.querySelector('html');
    if (html) {
        html.setAttribute('lang', lang);
        html.setAttribute('dir', languageDirections[lang])
    }
    // Arabic locale in moment uses Arabic-Indic numerals, while we in app use ordinary Arabic numerals
    // So we patch postformat to return string as-is, without replacing numbers
    moment.updateLocale('ar', {
        postformat: (x: any) => x,
    });

    moment.locale(lang);
    i18n.use(initReactI18next).init({
        debug: true,
        returnNull: false,
        fallbackLng: 'en',
        lng: lang,
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources,
    });
};

export const switchTranslationLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    moment.locale(lang.toLowerCase()); // Moment uses lowecase locales (e.g. zh-cn), but i18next requires them to be like zh-CN
    const html = document.querySelector('html');
    if (html) {
        html.setAttribute('lang', lang);
        html.setAttribute('dir', languageDirections[lang])
    }
};

export const translate = i18n.t;
