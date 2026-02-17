// TerraFusion OS — Trust Mode Context
// When enabled, provenance badges are always visible (not just on hover).

import { createContext, useContext, useState, ReactNode } from "react";

interface TrustModeContextValue {
  trustMode: boolean;
  setTrustMode: (v: boolean) => void;
}

const TrustModeContext = createContext<TrustModeContextValue>({
  trustMode: false,
  setTrustMode: () => {},
});

export function TrustModeProvider({ children }: { children: ReactNode }) {
  const [trustMode, setTrustMode] = useState(false);
  return (
    <TrustModeContext.Provider value={{ trustMode, setTrustMode }}>
      {children}
    </TrustModeContext.Provider>
  );
}

export function useTrustMode() {
  return useContext(TrustModeContext);
}
