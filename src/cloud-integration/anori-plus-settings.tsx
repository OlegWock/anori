import { createContext, type ReactNode, useContext } from "react";

type OpenAnoriPlusSettings = () => void;

const AnoriPlusSettingsContext = createContext<OpenAnoriPlusSettings>(() => {});

export const AnoriPlusSettingsProvider = ({ open, children }: { open: OpenAnoriPlusSettings; children: ReactNode }) => (
  <AnoriPlusSettingsContext.Provider value={open}>{children}</AnoriPlusSettingsContext.Provider>
);

export const useOpenAnoriPlusSettings = () => useContext(AnoriPlusSettingsContext);
