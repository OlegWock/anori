import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { type Language, languageDirections, resources } from "@anori/translations/metadata";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import moment from "moment";

export const initTranslation = async () => {
  const storage = await getAnoriStorage();
  const lang = storage.get(anoriSchema.language);

  const html = document.querySelector("html");
  if (html) {
    html.setAttribute("lang", lang);
    html.setAttribute("dir", languageDirections[lang]);
  }
  // Arabic locale in moment uses Arabic-Indic numerals, while we in app use ordinary Arabic numerals
  // So we patch postformat to return string as-is, without replacing numbers
  moment.updateLocale("ar", {
    postformat: (x: unknown) => x,
  });

  moment.locale(lang);
  i18n.use(initReactI18next).init({
    debug: true,
    returnNull: false,
    fallbackLng: "en",
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
  const html = document.querySelector("html");
  if (html) {
    html.setAttribute("lang", lang);
    html.setAttribute("dir", languageDirections[lang]);
  }
};

export const translate = i18n.t;
