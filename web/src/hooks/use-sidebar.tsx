import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

type SidebarSettings = { disabled: boolean; isHoverOpen: boolean };

type SidebarContextType = {
  isOpen: boolean;
  isHover: boolean;
  isMobile: boolean;
  settings: SidebarSettings;
  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsHover: (isHover: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  getOpenState: () => boolean;
  setSettings: (settings: Partial<SidebarSettings>) => void;
  setDisabled: (disabled: boolean) => void;
};

const defaultSettings: SidebarSettings = {
  disabled: false,
  isHoverOpen: false,
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isHover, setIsHover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettingsState] =
    useState<SidebarSettings>(defaultSettings);

  const toggleOpen = () => setIsOpen(!isOpen);

  const getOpenState = () => {
    return isOpen || (settings.isHoverOpen && isHover);
  };

  const setSettings = useCallback((newSettings: Partial<SidebarSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const setDisabled = useCallback(
    (disabled: boolean) => {
      setSettings({ disabled });
    },
    [setSettings],
  );

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isHover,
        isMobile,
        settings,
        toggleOpen,
        setIsOpen,
        setIsHover,
        setIsMobile,
        getOpenState,
        setSettings,
        setDisabled,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
