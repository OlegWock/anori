import enTranslation from "@anori/translations/en.json";
import { momentLocaleLoaders, translationLoaders } from "@anori/translations/loaders";
import { type Language, languageDirections } from "@anori/translations/metadata";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import type { Mapping } from "@anori/utils/types";
import i18n from "i18next";
import moment from "moment";
import { initReactI18next } from "react-i18next";

type TranslationBundle = { translation: Mapping };

const loadTranslationBundle = async (lang: Language): Promise<TranslationBundle> => {
  if (lang === "en") return enTranslation as TranslationBundle;
  const mod = (await translationLoaders[lang]()) as { default: TranslationBundle };
  return mod.default;
};

const loadMomentLocale = async (lang: Language): Promise<void> => {
  if (lang === "en") return;
  await momentLocaleLoaders[lang]();
};

const applyHtmlLangAttributes = (lang: Language) => {
  const html = document.querySelector("html");
  if (html) {
    html.setAttribute("lang", lang);
    html.setAttribute("dir", languageDirections[lang]);
  }
};

export const initTranslation = async () => {
  const storage = await getAnoriStorage();
  const lang = storage.get(anoriSchema.language);

  if (typeof document !== "undefined") {
    applyHtmlLangAttributes(lang);
  }

  const [bundle] = await Promise.all([loadTranslationBundle(lang), loadMomentLocale(lang)]);

  // Arabic locale in moment uses Arabic-Indic numerals, while we in app use ordinary Arabic numerals
  // So we patch postformat to return string as-is, without replacing numbers
  if (lang === "ar") {
    moment.updateLocale("ar", {
      postformat: (x: unknown) => x,
    });
  }
  moment.locale(lang.toLowerCase());

  i18n.use(initReactI18next).init({
    debug: true,
    returnNull: false,
    fallbackLng: "en",
    lng: lang,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources:
      lang === "en"
        ? { en: enTranslation as TranslationBundle }
        : { en: enTranslation as TranslationBundle, [lang]: bundle },
  });
};

export const switchTranslationLanguage = async (lang: Language) => {
  if (!i18n.hasResourceBundle(lang, "translation")) {
    const [bundle] = await Promise.all([loadTranslationBundle(lang), loadMomentLocale(lang)]);
    i18n.addResourceBundle(lang, "translation", bundle.translation, true, true);
  }
  i18n.changeLanguage(lang);
  moment.locale(lang.toLowerCase()); // Moment uses lowecase locales (e.g. zh-cn), but i18next requires them to be like zh-CN

  if (typeof document !== "undefined") {
    applyHtmlLangAttributes(lang);
  }
};

export const translate = i18n.t;
