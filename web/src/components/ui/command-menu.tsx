import * as React from "react";
import { Command } from "@/hooks/use-commands";
import { cn } from "@/lib/utils";

interface CommandMenuProps {
  commands: Command[];
  isOpen: boolean;
  onSelect: (command: Command) => void;
  className?: string;
  position?: {
    top?: string | number;
    left?: string | number;
    bottom?: string | number;
    right?: string | number;
  };
}

export function CommandMenu({
  commands,
  isOpen,
  onSelect,
  className,
  position = { top: "100%", left: 0 },
}: CommandMenuProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuHeight, setMenuHeight] = React.useState<number | null>(null);
  const itemHeight = 56; // Average height of an item in pixels (adjust if needed)

  // Reset active index when commands change
  React.useEffect(() => {
    setActiveIndex(0);
  }, [commands]);

  // Calculate menu height based on number of items
  React.useEffect(() => {
    if (commands.length > 0) {
      // Calculate the ideal height based on number of items (with a cap of around 250px)
      const calculatedHeight = Math.min(commands.length * itemHeight, 250);
      setMenuHeight(calculatedHeight);
    }
  }, [commands]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % commands.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(
            (prev) => (prev - 1 + commands.length) % commands.length,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (commands[activeIndex]) {
            onSelect(commands[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, commands, activeIndex, onSelect]);

  // Scroll active item into view
  React.useEffect(() => {
    if (isOpen && menuRef.current) {
      const activeItem = menuRef.current.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

  if (!isOpen || commands.length === 0) return null;

  // Calculate adjusted position
  const adjustedPosition = {
    ...position,
    // If the initial position is using negative top (menu above input),
    // adjust it based on the actual content height
    ...(position.top &&
      typeof position.top === "string" &&
      position.top.startsWith("-") && {
        top: menuHeight ? `-${menuHeight + 10}px` : position.top,
      }),
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute z-50 bg-popover shadow-md rounded-md border overflow-hidden w-64 overflow-y-auto",
        className,
      )}
      style={{
        ...adjustedPosition,
        maxHeight: menuHeight ? `${menuHeight}px` : "250px",
        // If there are few items, set a fixed height
        height:
          commands.length <= 5
            ? `${commands.length * itemHeight}px`
            : undefined,
      }}
    >
      <div className="py-1 text-sm">
        {commands.length === 0 ? (
          <div className="px-3 py-2 text-muted-foreground">
            No commands found
          </div>
        ) : (
          commands.map((command, index) => (
            <div
              key={command.id}
              className={cn(
                "px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-white/50",
                index === activeIndex && "bg-white text-black",
              )}
              data-active={index === activeIndex}
              onClick={() => onSelect(command)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {command.icon && (
                <command.icon className="w-4 h-4 text-muted-foreground" />
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium">{command.label}</span>
                {command.description && (
                  <span className="text-xs text-muted-foreground truncate">
                    {command.description}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
