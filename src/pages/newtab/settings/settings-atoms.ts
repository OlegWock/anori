import { atom } from "jotai";

export type SettingScreen =
  | "main"
  | "general"
  | "custom-icons"
  | "folders"
  | "plugins"
  | "theme"
  | "import-export"
  | "about-help";

export const currentScreenAtom = atom<SettingScreen>("main");
