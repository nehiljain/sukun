"use client";

import { useState, useEffect, useRef } from "react";
import { useChatHistory } from "./hooks/useChatHistory";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { QuickOptions } from "./components/QuickOptions";
import { ThinkingIndicator } from "./components/ThinkingIndicator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChatMessage as ChatMessageType, CommandContext } from "./types";
import { ddApiClient } from "@/lib/api-client";

export type ChatEntityType = "video-projects" | "render-videos";

export default function ChatWindow({
  entityId,
  entityType = "video-projects",
  className,
}: {
  entityId?: string;
  entityType?: ChatEntityType;
  className?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsingTools, setIsUsingTools] = useState(false);
  const [timelinePosition] = useState(0);
  const { chatHistory, loading, addMessage, setChatHistory } = useChatHistory(
    entityId,
    entityType,
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isSubmitting]);

  // Additional scroll effect for smooth scrolling to new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isSubmitting]);

  const handleSubmit = async (
    message: string,
    commandContext?: CommandContext,
  ) => {
    if (!message.trim()) return;

    // Check if this is a direct agent query
    const isDirectQuery = message.startsWith("[DIRECT_AGENT_QUERY]");

    // Extract the actual message
    const actualMessage = isDirectQuery
      ? message.replace("[DIRECT_AGENT_QUERY]", "").trim()
      : message;

    setIsSubmitting(true);

    // Direct queries are more likely to use tools
    setIsUsingTools(isDirectQuery);

    const newMessage: ChatMessageType = {
      sender: "user",
      message: actualMessage,
      timestamp: new Date().toISOString(),
      ...(commandContext
        ? {
            type: "command",
            command_data: {
              ...commandContext,
            },
          }
        : { type: "text" }),
    };

    // Add user message optimistically before API call
    setChatHistory((prev) => [...prev, newMessage]);

    if (entityId) {
      try {
        // For direct queries, use the agent_query endpoint instead
        if (isDirectQuery) {
          // Add a custom header to indicate this is a direct query to the agent
          const agentResponse = await ddApiClient.post(
            `/api/${entityType}/${entityId}/agent_query/`,
            { query: actualMessage },
          );

          if (agentResponse.status !== 200) {
            throw new Error("Failed to get response from agent");
          }

          const data = agentResponse.data;

          // Add the agent's response to the chat history
          setChatHistory((prev) => [
            ...prev,
            {
              sender: "assistant",
              message: data.response,
              timestamp: new Date().toISOString(),
              type: "agent",
              metadata: data.metadata || {},
            },
          ]);
        } else {
          // For regular messages, use the regular addMessage function
          await addMessage(newMessage);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error("Failed to send message");
        // Remove the optimistically added message on failure
        setChatHistory((prev) =>
          prev.filter((msg) => msg.timestamp !== newMessage.timestamp),
        );
      } finally {
        setIsSubmitting(false);
        setIsUsingTools(false);
      }
    } else {
      // Handle case where there's no entityId (e.g., local demo)
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "system",
            message: `Received: "${actualMessage}" (No backend connected)`,
            timestamp: new Date().toISOString(),
            type: "text",
          },
        ]);
        setIsSubmitting(false);
        setIsUsingTools(false);
      }, 1000);
    }
  };

  // Handle quick option clicks - reuse handleSubmit logic
  const handleQuickOptionClick = (optionText: string) => {
    handleSubmit(optionText);
  };

  const handleVideoClick = (mediaId: string) => {
    if (entityId) {
      window.location.href = `/video-player/${mediaId}`;
    } else {
      console.warn("Cannot navigate to video, entityId is missing.");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full relative bg-background",
        className,
      )}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* <h1 className="flex items-center text-lg font-semibold p-4 pb-2 border-b">
          <BotIcon className="w-6 h-6 mr-2 text-primary" />
           DD Agent
        </h1> */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-0 pr-2 pb-4 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {loading && chatHistory.length === 0 ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>Loading messages...</p>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <ChatMessage
                  key={`${msg.sender}-${msg.timestamp}-${index}`}
                  message={msg}
                  onVideoClick={handleVideoClick}
                />
              ))
            )}
            {/* Show ThinkingIndicator while submitting */}
            {isSubmitting && (
              <ThinkingIndicator showToolsIndicator={isUsingTools} />
            )}
            {/* Add empty div to push content up when scrolling */}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Input area with background */}
      <div className="mt-auto p-4 border-t bg-background">
        {/* Conditionally render QuickOptions only if not loading/submitting */}
        {!loading && !isSubmitting && (
          <QuickOptions onOptionSelect={handleQuickOptionClick} />
        )}
        <ChatInput
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          disabled={loading}
          timelinePosition={timelinePosition}
        />
      </div>
    </div>
  );
}
