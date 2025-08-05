"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

export interface TextareaAutosizeProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

const TextareaAutosize = React.forwardRef<
  HTMLTextAreaElement,
  TextareaAutosizeProps
>(({ className, maxHeight = 200, onChange, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [textareaHeight, setTextareaHeight] = React.useState("auto");

  // Function to update textarea height
  const updateHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate new height (capped at maxHeight)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);

    // Set the height
    textarea.style.height = `${newHeight}px`;
    setTextareaHeight(`${newHeight}px`);
  }, [maxHeight]);

  // Handle onChange event
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateHeight();
    if (onChange) {
      onChange(e);
    }
  };

  // Update height on mount and when content changes
  React.useEffect(() => {
    updateHeight();
  }, [props.value, updateHeight]);

  return (
    <Textarea
      ref={(element) => {
        // Handle both the forwarded ref and our local ref
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
        textareaRef.current = element;
      }}
      className={cn(
        "overflow-y-auto resize-none transition-height duration-100",
        className,
      )}
      onChange={handleChange}
      style={{
        height: textareaHeight,
        maxHeight: `${maxHeight}px`,
      }}
      {...props}
    />
  );
});

TextareaAutosize.displayName = "TextareaAutosize";

export { TextareaAutosize };
