import React from "react";

export const CursorOverlay: React.FC<{
  position: { x: number; y: number } | null;
  dimensions: { width: number; height: number };
}> = ({ position, dimensions }) => {
  if (!position) return null;

  // Calculate coordinates relative to bottom-left (0,0)
  const relativeX = Math.round(position.x);
  const relativeY = Math.round(dimensions.height - position.y);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Horizontal dotted line */}
      <div
        className="absolute border-t border-dashed border-white/50 w-full"
        style={{ top: `${position.y}px` }}
      />

      {/* Vertical dotted line */}
      <div
        className="absolute border-l border-dashed border-white/50 h-full"
        style={{ left: `${position.x}px` }}
      />

      {/* Coordinates tooltip */}
      <div
        className="absolute bg-black/75 text-white text-xs px-2 py-1 rounded pointer-events-none"
        style={{
          left: `${position.x + 10}px`,
          top: `${position.y - 30}px`,
        }}
      >
        {relativeX}, {relativeY}
      </div>
    </div>
  );
};
