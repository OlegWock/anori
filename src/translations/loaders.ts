import type { Language } from "@anori/translations/metadata";

type NonEnglish = Exclude<Language, "en">;

/**
 * Per-language dynamic imports. English is bundled statically (it's the fallback and most common language),
 * so it's intentionally absent here — every other language is split into its own chunk loaded on demand.
 * File names are lowercase (`zh-cn.json`) while the i18next language codes are not (`zh-CN`).
 */
export const translationLoaders = {
  de: () => import("./de.json"),
  fr: () => import("./fr.json"),
  es: () => import("./es.json"),
  it: () => import("./it.json"),
  uk: () => import("./uk.json"),
  th: () => import("./th.json"),
  tr: () => import("./tr.json"),
  "zh-CN": () => import("./zh-cn.json"),
  ru: () => import("./ru.json"),
  ar: () => import("./ar.json"),
  "pt-BR": () => import("./pt-br.json"),
  ja: () => import("./ja.json"),
  vi: () => import("./vi.json"),
  pl: () => import("./pl.json"),
  sk: () => import("./sk.json"),
  cs: () => import("./cs.json"),
  id: () => import("./id.json"),
  fil: () => import("./fil.json"),
  hi: () => import("./hi.json"),
} satisfies Record<NonEnglish, () => Promise<unknown>>;

export const momentLocaleLoaders = {
  de: () => import("moment/locale/de"),
  fr: () => import("moment/locale/fr"),
  es: () => import("moment/locale/es"),
  it: () => import("moment/locale/it"),
  uk: () => import("moment/locale/uk"),
  th: () => import("moment/locale/th"),
  tr: () => import("moment/locale/tr"),
  "zh-CN": () => import("moment/locale/zh-cn"),
  ru: () => import("moment/locale/ru"),
  ar: () => import("moment/locale/ar"),
  "pt-BR": () => import("moment/locale/pt-br"),
  ja: () => import("moment/locale/ja"),
  vi: () => import("moment/locale/vi"),
  pl: () => import("moment/locale/pl"),
  sk: () => import("moment/locale/sk"),
  cs: () => import("moment/locale/cs"),
  id: () => import("moment/locale/id"),
  fil: () => import("moment/locale/fil"),
  hi: () => import("moment/locale/hi"),
} satisfies Record<NonEnglish, () => Promise<unknown>>;
