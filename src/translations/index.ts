import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './en.json';
import esTranslation from './es.json';
import { storage } from '@utils/storage';
import moment from 'moment';
import 'moment/locale/es';

export const SHOW_LANGUAGE_SELECT_IN_SETTINGS = false;

export const availableTranslations = ['en', 'es'] as const;

export type Language = typeof availableTranslations[number];

export const availableTranslationsPrettyNames = {
    'en': 'English',
    'es': 'Español'
} satisfies Record<Language, string>;

export const initTranslation = async () => {
    const lang = await storage.getOne('language');
    i18n.use(initReactI18next).init({
        debug: true,
        returnNull: false,
        fallbackLng: 'en',
        lng: lang || 'en',
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources: {
            en: enTranslation,
            es: esTranslation,
        }
    });
};

export const switchTranslationLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    moment.locale(lang);
};

export const translate = i18n.t;
