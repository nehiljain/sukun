import { useState, useCallback } from "react";
import { Comment, CommentActions } from "../types";

export const useComments = (currentFrame: number, video_asset_id?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);

  const handleAddNewComment = useCallback(
    (text: string, actions: CommentActions) => {
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        timestamp: currentFrame,
        text,
        createdAt: new Date().toISOString(),
        actions,
      };
      setComments((prev) => [...prev, newComment]);
      setIsCommentPanelOpen(false);
    },
    [currentFrame],
  );

  const handleTakeAction = useCallback(async () => {
    try {
      const newStatus =
        comments.length === 0 ? "accepted" : "changes_requested";
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];

      const response = await fetch(
        `/api/video-assets/${video_asset_id}/update_status/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Video asset status updated");
    } catch (error) {
      console.error("Error updating video asset status:", error);
      // Handle error (e.g., show error toast)
    }
  }, [video_asset_id, comments.length]);

  return {
    comments,
    setComments,
    isCommentPanelOpen,
    setIsCommentPanelOpen,
    handleAddNewComment,
    handleTakeAction,
  };
};
