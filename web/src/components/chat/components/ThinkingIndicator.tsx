import { cn } from "@/lib/utils";
import { WrenchIcon } from "lucide-react";

interface ThinkingIndicatorProps {
  showToolsIndicator?: boolean;
}

export const ThinkingIndicator = ({
  showToolsIndicator = false,
}: ThinkingIndicatorProps) => {
  return (
    <div className="flex flex-col items-start mb-4">
      <div className="rounded-lg p-3 shadow-sm bg-muted text-secondary-foreground max-w-[80%] flex items-center">
        <div className="flex items-center gap-2">
          {showToolsIndicator && (
            <div className="animate-pulse flex items-center gap-1">
              <WrenchIcon className="h-4 w-4" />
              <span>Using tools</span>
            </div>
          )}
          {!showToolsIndicator && (
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-secondary-foreground animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 rounded-full bg-secondary-foreground animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 rounded-full bg-secondary-foreground animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
