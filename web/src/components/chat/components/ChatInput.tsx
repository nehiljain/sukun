// Chat input component with command support
import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send, Terminal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { CommandContext } from "@/hooks/use-commands";

interface ChatInputProps {
  onSubmit: (message: string, commandContext?: CommandContext) => void;
  isSubmitting: boolean;
  disabled?: boolean;
  timelinePosition?: number;
}

export const ChatInput = ({
  onSubmit,
  isSubmitting,
  disabled = false,
  timelinePosition = 0,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isDirect, setIsDirect] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Reset height when message is sent
  useEffect(() => {
    if (!isSubmitting && !message && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [isSubmitting, message]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const submitMessage = () => {
    if (message.trim() && !isSubmitting && !disabled) {
      // Pass direct mode flag as part of the message
      const formattedMessage = isDirect
        ? `[DIRECT_AGENT_QUERY] ${message}`
        : message;
      onSubmit(formattedMessage);
      setMessage("");
      // Reset the textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const toggleDirectMode = () => {
    setIsDirect(!isDirect);
    // Focus the textarea after toggling
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isDirect
                ? "Send a direct query to the agent's tools..."
                : "Send a message..."
            }
            disabled={isSubmitting || disabled}
            className={`min-h-[40px] max-h-[200px] py-3 pr-10 resize-none border-input bg-background ${
              isDirect ? "border-2 border-amber-500" : ""
            }`}
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-1.5 text-muted-foreground hover:text-foreground"
            onClick={toggleDirectMode}
            title={isDirect ? "Normal mode" : "Direct agent query"}
          >
            {isDirect ? (
              <Terminal className="h-4 w-4 text-amber-500" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* <Button
          onClick={submitMessage}
          disabled={!message.trim() || isSubmitting || disabled}
          size="icon"
          type="submit"
          className={isDirect ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          <Send className="h-4 w-4" />
        </Button> */}
      </div>
    </div>
  );
};
