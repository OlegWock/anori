import type { Mapping } from "@anori/utils/types";
import moment from "moment";

import arTranslation from "./ar.json";
import deTranslation from "./de.json";
import enTranslation from "./en.json";
import esTranslation from "./es.json";
import frTranslation from "./fr.json";
import itTranslation from "./it.json";
import jaTranslation from "./ja.json";
import ptBrTranslation from "./pt-br.json";
import ruTranslation from "./ru.json";
import thTranslation from "./th.json";
import trTranslation from "./tr.json";
import ukTranslation from "./uk.json";
import zhCnTranslation from "./zh-cn.json";
// When adding any of moment locales, don't forget to update rspack config to actually include them in build
import "moment/locale/uk";
import "moment/locale/de";
import "moment/locale/fr";
import "moment/locale/es";
import "moment/locale/ru";
import "moment/locale/th";
import "moment/locale/tr";
import "moment/locale/it";
import "moment/locale/ar";
import "moment/locale/zh-cn";
import "moment/locale/ja";
import "moment/locale/pt-br";
moment.locale("en");

export const availableTranslations = [
  "en",
  "de",
  "fr",
  "es",
  "pt-BR",
  "it",
  "uk",
  "th",
  "tr",
  "zh-CN",
  "ru",
  "ar",
  "ja",
] as const;

export type Language = (typeof availableTranslations)[number];

export const availableTranslationsPrettyNames = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  uk: "Українська",
  th: "ไทย",
  tr: "Türkçe",
  "zh-CN": "中文 (简体)",
  ru: "Русский",
  es: "Español",
  ar: "العربية",
  "pt-BR": "Português do Brasil",
  ja: "日本語",
  // 'zh-TW': '中文 (繁體)',
} satisfies Record<Language, string>;

export const resources = {
  en: enTranslation,
  de: deTranslation,
  fr: frTranslation,
  es: esTranslation,
  it: itTranslation,
  uk: ukTranslation,
  th: thTranslation,
  tr: trTranslation,
  "zh-CN": zhCnTranslation,
  ru: ruTranslation,
  ar: arTranslation,
  "pt-BR": ptBrTranslation,
  ja: jaTranslation,
} satisfies Record<Language, Mapping>;

export const languageDirections = {
  en: "ltr",
  de: "ltr",
  fr: "ltr",
  es: "ltr",
  it: "ltr",
  uk: "ltr",
  th: "ltr",
  tr: "ltr",
  "zh-CN": "ltr",
  ru: "ltr",
  "pt-BR": "ltr",
  ar: "rtl",
  ja: "ltr",
} satisfies Record<Language, "rtl" | "ltr">;
