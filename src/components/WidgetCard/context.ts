import { createContext, createRef, useContext } from "react";

export const WidgetCardContext = createContext({
  cardRef: createRef<HTMLDivElement>(),
});

export const useParentWidgetCardRef = () => useContext(WidgetCardContext).cardRef;
