import { CommandContext } from "@/hooks/use-commands"; // Assuming this path is correct

interface CommandViewProps {
  commandData: CommandContext;
}

export const CommandView = ({ commandData }: CommandViewProps) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md text-sm font-medium">
          @{commandData.text}
        </span>
        {commandData.timelinePosition !== undefined && (
          <span className="text-xs text-muted-foreground">
            at {commandData.timelinePosition}s
          </span>
        )}
      </div>
      {commandData.additionalContext && (
        <p className="mt-1">{commandData.additionalContext}</p>
      )}
    </div>
  );
};
