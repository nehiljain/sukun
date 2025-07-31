import { useState } from "react";

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
}

export interface CommandContext {
  text: string;
  timelinePosition?: number;
  additionalContext?: string;
}

const defaultCommands: Command[] = [
  {
    id: "agent",
    label: "agent",
    description: "Give DD agent instructions",
  },
  {
    id: "ai",
    label: "ai",
    description: "Give feedback to the AI video generation",
  },
  {
    id: "split",
    label: "split",
    description: "Split the timeline at the current position",
  },
  {
    id: "trim",
    label: "trim",
    description: "Trim the video at the current position",
  },
];

export const useCommands = () => {
  const [commands] = useState<Command[]>(defaultCommands);
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<Command | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandPosition, setCommandPosition] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const getFilteredCommands = (query: string) => {
    if (!query.trim()) return commands;

    const lowercaseQuery = query.toLowerCase();
    return commands.filter((command) =>
      command.label.toLowerCase().includes(lowercaseQuery),
    );
  };

  const resetCommandState = () => {
    setIsCommandMode(false);
    setCurrentCommand(null);
    setCommandQuery("");
    setCommandPosition(null);
  };

  const handleCommandTrigger = (text: string, cursorPosition: number) => {
    const atSymbolIndex = text.lastIndexOf("@", cursorPosition);

    if (atSymbolIndex === -1 || atSymbolIndex >= cursorPosition) {
      resetCommandState();
      return;
    }

    // Extract the query between @ and the cursor
    const query = text.substring(atSymbolIndex + 1, cursorPosition);

    // If there's a space after the @ symbol, exit command mode
    if (query.includes(" ")) {
      resetCommandState();
      return;
    }

    setIsCommandMode(true);
    setCommandQuery(query);
    setCommandPosition({ start: atSymbolIndex, end: cursorPosition });

    // Reset current command when typing
    if (
      currentCommand &&
      !currentCommand.label.toLowerCase().startsWith(query.toLowerCase())
    ) {
      setCurrentCommand(null);
    }

    return getFilteredCommands(query);
  };

  const selectCommand = (command: Command) => {
    setCurrentCommand(command);
    setIsCommandMode(false);
  };

  const parseCommandFromText = (text: string): CommandContext | null => {
    if (!text.includes("@")) return null;

    const commandRegex = /@(\w+)(?:\s+(.*))?/;
    const match = text.match(commandRegex);

    if (!match) return null;

    const [, commandName, additionalContext] = match;
    const command = commands.find((cmd) => cmd.label === commandName);

    if (!command) return null;

    return {
      text: commandName,
      additionalContext: additionalContext?.trim(),
    };
  };

  return {
    commands,
    isCommandMode,
    currentCommand,
    commandQuery,
    commandPosition,
    filteredCommands: getFilteredCommands(commandQuery),
    handleCommandTrigger,
    selectCommand,
    resetCommandState,
    parseCommandFromText,
  };
};
