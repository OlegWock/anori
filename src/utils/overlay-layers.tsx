import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";

export type OverlayLayers = {
  register: () => () => void;
  hasActiveOverlay: () => boolean;
};

const createOverlayLayers = (): OverlayLayers => {
  let count = 0;
  return {
    register: () => {
      count += 1;
      return () => {
        count -= 1;
      };
    },
    hasActiveOverlay: () => count > 0,
  };
};

const OverlayLayersContext = createContext<OverlayLayers>(createOverlayLayers());

export const OverlayLayersProvider = ({ children }: { children: ReactNode }) => {
  const ref = useRef<OverlayLayers>(undefined);
  if (!ref.current) ref.current = createOverlayLayers();
  return <OverlayLayersContext.Provider value={ref.current}>{children}</OverlayLayersContext.Provider>;
};

export const useOverlayLayers = () => useContext(OverlayLayersContext);

export const useRegisterOverlayLayer = (active = true) => {
  const overlayLayers = useOverlayLayers();
  useLayoutEffect(() => {
    if (!active) return;
    return overlayLayers.register();
  }, [active, overlayLayers]);
};
