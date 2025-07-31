import { useEffect, useRef } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useTray } from "../../contexts/tray-context";

export function ChatTray({ projectId }: { projectId?: string }) {
  const { activeTray } = useTray();
  const chatRef = useRef<HTMLDivElement>(null);

  // Focus the chat input when the tray is opened
  useEffect(() => {
    if (activeTray === "chat") {
      // Short delay to ensure the DOM is ready
      setTimeout(() => {
        if (chatRef.current) {
          // Find the textarea within the chat window
          const textarea = chatRef.current.querySelector("textarea");
          if (textarea) {
            textarea.focus();
          }
        }
      }, 50);
    }
  }, [activeTray]);

  return (
    <div ref={chatRef} className="h-full">
      <ChatWindow projectId={projectId} className="h-full" />
    </div>
  );
}
