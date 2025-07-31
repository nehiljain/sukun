import { Button } from "@/components/ui/button";

import { ButtonProps } from "@/components/ui/button";

export interface RightTrayAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
}

interface RightTrayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions?: RightTrayAction[];
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  children: React.ReactNode;
}

export function RightTray({
  isOpen,
  onClose,
  title,
  subtitle,
  actions = [],
  isFullScreen,
  onToggleFullScreen,
  children,
}: RightTrayProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Tray */}
      <div
        className={`text-foreground fixed right-0 top-0 border-l z-50 transform transition-transform duration-200 ease-in-out h-screen bg-background ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } ${isFullScreen ? "w-[90%]" : "w-full md:w-1/2 lg:w-1/3"}`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className="sticky top-0 bg-background border-b z-10">
            <div className="flex items-center justify-between p-4">
              <div>
                <h2 className="text-lg text-primary font-semibold">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className="flex gap-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "secondary"}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </Button>
                ))}
                {onToggleFullScreen && (
                  <Button variant="secondary" onClick={onToggleFullScreen}>
                    {isFullScreen ? "↙" : "↗"}
                  </Button>
                )}
                <Button variant="secondary" onClick={onClose}>
                  ✕
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
