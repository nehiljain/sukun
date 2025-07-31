import { cn } from "@/lib/utils";

interface CommandHighlightProps {
  text: string;
  command: { label: string } | null;
  className?: string;
}

export function CommandHighlight({
  text,
  command,
  className,
}: CommandHighlightProps) {
  if (!command) return <>{text}</>;

  // Find the command in the text
  const commandRegex = new RegExp(`@(${command.label})(\\s.*)?$`);
  const match = text.match(commandRegex);

  if (!match) return <>{text}</>;

  const [fullMatch, commandText, rest] = match;
  const startIndex = match.index || 0;
  const beforeCommand = text.substring(0, startIndex);

  return (
    <>
      {beforeCommand}
      <span className="text-primary">@{commandText}</span>
      {rest}
    </>
  );
}
