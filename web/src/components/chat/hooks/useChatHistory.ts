// Custom hook for managing chat history
import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "../types";
import { ddApiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { ChatEntityType } from "../ChatWindow";

export const useChatHistory = (
  entityId?: string,
  entityType: ChatEntityType = "video-projects",
) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChatHistory = useCallback(async () => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await ddApiClient.get(
        `/api/${entityType}/${entityId}/chat_history/`,
      );

      // Process the messages to handle any agent metadata
      const messages = Array.isArray(response.data) ? response.data : [];

      // Convert any 'assistant' sender to the correct format
      const processedMessages = messages.map((msg: any) => {
        const message: ChatMessage = {
          ...msg,
          // Ensure metadata is properly structured if it exists
          metadata: msg.metadata ? msg.metadata : undefined,
          // Set type to 'agent' if the message has metadata with used_tools
          type:
            msg.metadata?.used_tools?.length > 0 ? "agent" : msg.type || "text",
        };
        return message;
      });

      setChatHistory(processedMessages);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      toast.error("Failed to load chat history.");
      setChatHistory([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  const addMessage = useCallback(
    async (message: ChatMessage) => {
      if (!entityId) {
        console.warn("No entityId, skipping API call for addMessage");
        return Promise.resolve();
      }

      try {
        const response = await ddApiClient.post(
          `/api/${entityType}/${entityId}/add_message/`,
          message,
        );

        // Handle the response which could contain processed messages
        const result = response.data?.messages || [];

        // If we got messages back directly, use those instead of fetching again
        if (Array.isArray(result) && result.length > 0) {
          setChatHistory(
            result.map((msg: any) => ({
              ...msg,
              metadata: msg.metadata ? msg.metadata : undefined,
              type:
                msg.metadata?.used_tools?.length > 0
                  ? "agent"
                  : msg.type || "text",
            })),
          );
        } else {
          // Otherwise fetch the updated history
          await fetchChatHistory();
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
      }
    },
    [entityId, entityType, fetchChatHistory],
  );

  useEffect(() => {
    if (entityId) {
      fetchChatHistory();
    } else {
      if (chatHistory.length === 0) {
        setChatHistory([
          {
            sender: "system",
            message:
              "Hi, I am DD Agent! Describe your video needs. Try using @commands to control the timeline.",
            timestamp: new Date().toISOString(),
            type: "text",
          },
        ]);
      }
    }
  }, [entityId, fetchChatHistory, chatHistory.length]);

  return {
    chatHistory,
    loading,
    addMessage,
    fetchChatHistory,
    setChatHistory,
  };
};
