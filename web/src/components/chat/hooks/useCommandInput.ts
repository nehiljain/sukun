import { useState, useRef, useCallback } from "react";
import { useCommands, Command } from "@/hooks/use-commands"; // Adjust path if needed

export const useCommandInput = () => {
  const [message, setMessage] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isCommandMode,
    currentCommand,
    filteredCommands,
    handleCommandTrigger,
    selectCommand,
    resetCommandState,
    parseCommandFromText,
  } = useCommands();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setMessage(newValue);
      if (textareaRef.current) {
        const currentCursorPos = textareaRef.current.selectionStart || 0;
        setCursorPosition(currentCursorPos);
        handleCommandTrigger(newValue, currentCursorPos);
      }
    },
    [handleCommandTrigger],
  );

  // Function to handle cursor position change via selection/keyup
  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      const currentCursorPos = textareaRef.current.selectionStart || 0;
      setCursorPosition(currentCursorPos);
      // Trigger command check on selection change as well
      handleCommandTrigger(message, currentCursorPos);
    }
  }, [message, handleCommandTrigger]);

  const handleCommandSelect = useCallback(
    (command: Command) => {
      if (!textareaRef.current) return;

      const text = message;
      // Find the last '@' before the current cursor position
      const atPos = text.substring(0, cursorPosition).lastIndexOf("@");

      if (atPos === -1) return; // Should not happen if command mode is active

      // Replace the command trigger and partial input with the selected command
      const beforeCommand = text.substring(0, atPos);
      // Find the end of the partial command input (e.g., space or end of string)
      const spaceAfterCommand = text.indexOf(" ", atPos);
      const currentPartialCommandEnd =
        spaceAfterCommand !== -1 && spaceAfterCommand < cursorPosition
          ? spaceAfterCommand
          : cursorPosition;

      const afterCommand = text.substring(currentPartialCommandEnd);

      // Ensure a space after the command unless it's the end of the text
      const space =
        afterCommand.startsWith(" ") || afterCommand === "" ? "" : " ";
      const newText = `${beforeCommand}@${command.label}${space}${afterCommand.trimStart()}`; // Use trimStart on afterCommand

      setMessage(newText);
      selectCommand(command); // Update command state if needed

      // Set cursor position right after the inserted command + space
      const newPosition = atPos + command.label.length + 1 + space.length; // +1 for '@'

      // Use setTimeout to ensure the state update has rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          setCursorPosition(newPosition); // Update internal cursor state
          resetCommandState(); // Close command menu after selection
        }
      }, 0);
    },
    [message, cursorPosition, selectCommand, resetCommandState],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        isCommandMode &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "Enter" ||
          e.key === "Tab")
      ) {
        // Prevent default browser behavior only if the command menu should handle it
        e.preventDefault();
        // CommandMenu likely handles Enter/Tab selection via its props or internal state
      } else if (e.key === "Enter" && !e.shiftKey && !isCommandMode) {
        e.preventDefault();
        // This will be handled by the parent's onSubmit
      } else if (e.key === "Escape" && isCommandMode) {
        e.preventDefault();
        resetCommandState();
      }
    },
    [isCommandMode, resetCommandState],
  );

  return {
    message,
    setMessage, // Expose setMessage for clearing after submit
    textareaRef,
    cursorPosition,
    handleInputChange,
    handleSelectionChange,
    handleCommandSelect,
    handleKeyDown,
    isCommandMode,
    currentCommand,
    filteredCommands,
    resetCommandState,
    parseCommandFromText,
  };
};
