import { createContext, useContext, useState, ReactNode } from "react";

type TrayType = "renders" | "duplicate" | "template" | "chat" | null;

interface TrayContextType {
  activeTray: TrayType;
  setActiveTray: (tray: TrayType) => void;
}

const TrayContext = createContext<TrayContextType | undefined>(undefined);

export function TrayProvider({ children }: { children: ReactNode }) {
  const [activeTray, setActiveTray] = useState<TrayType>(null);

  return (
    <TrayContext.Provider value={{ activeTray, setActiveTray }}>
      {children}
    </TrayContext.Provider>
  );
}

export function useTray() {
  const context = useContext(TrayContext);
  if (context === undefined) {
    throw new Error("useTray must be used within a TrayProvider");
  }
  return context;
}
