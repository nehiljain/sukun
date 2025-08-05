import React, { useState } from "react";
import { SketchPicker } from "react-color";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

/**
 * A simple color picker component that uses the browser's native color input
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (color: any) => {
    // Convert to rgba if there's transparency, otherwise use hex
    const newColor =
      color.rgb.a < 1
        ? `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`
        : color.hex;
    onChange(newColor);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-8 rounded-md border cursor-pointer"
          style={{ backgroundColor: color }}
          aria-label="Pick color"
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto text-secondary p-0 border-none"
        sideOffset={5}
      >
        <SketchPicker
          color={color}
          onChange={handleColorChange}
          disableAlpha={false}
        />
      </PopoverContent>
    </Popover>
  );
};
