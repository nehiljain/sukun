import { ChatMessage as ChatMessageType } from "../types";
import { StoryboardView } from "./StoryboardView";
import { CommandView } from "./CommandView";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ImageIcon, WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { memo } from "react";

interface ChatMessageProps {
  message: ChatMessageType;
  onVideoClick: (mediaId: string) => void;
}

export const ChatMessage = memo(
  ({ message, onVideoClick }: ChatMessageProps) => {
    // Handle video click safely
    const handleVideoClick = () => {
      if (message.media?.id) {
        onVideoClick(message.media.id);
      }
    };

    // Check if the message used tools
    const usedTools = message.metadata?.used_tools || [];
    const hasUsedTools = usedTools.length > 0;

    return (
      <div
        className={cn(
          "group flex flex-col w-full items-start mb-4",
          message.sender === "user" && "items-end",
        )}
      >
        <div
          className={cn(
            "relative max-w-[80%] min-w-[60px] px-4 py-3 rounded-2xl shadow-sm border border-transparent",
            message.sender === "user"
              ? "bg-primary text-primary-foreground self-end rounded-br-md"
              : "bg-muted/80 text-foreground self-start rounded-bl-md border-border",
            "transition-colors duration-200",
          )}
        >
          {message.type === "storyboard" && message.storyboard_data ? (
            <StoryboardView message={message} />
          ) : message.type === "command" && message.command_data ? (
            <CommandView commandData={message.command_data} />
          ) : (
            <>
              {/* Render rich text HTML, allow only safe tags */}
              <div
                className="rich-text break-words whitespace-pre-line text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: message.message }}
              />
              {hasUsedTools && (
                <div className="mt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 text-xs bg-background/60 border-none px-2 py-1"
                        >
                          <WrenchIcon className="h-3 w-3" />
                          {usedTools.length}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="text-xs">
                          Tools used: {usedTools.join(", ")}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </>
          )}
          {message.media?.type === "video" && (
            <Card
              className="group/card mt-3 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={handleVideoClick}
            >
              <div className="relative aspect-video">
                <img
                  src={message.media.thumbnail_url}
                  alt={message.media.id}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </Card>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1.5 ml-2 opacity-80 select-none">
          {new Date(message.timestamp).toLocaleString()}
        </span>
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";

// Tailwind for .rich-text (add to global styles if not present):
// .rich-text ul { @apply list-disc pl-5 my-2; }
// .rich-text li { @apply mb-1; }
// .rich-text b, .rich-text strong { @apply font-semibold; }
// .rich-text br { @apply block; }
