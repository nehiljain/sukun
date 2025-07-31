import React, { useState } from "react";
import { RightTray } from "@/components/shared/RightTray";
import { Button } from "@/components/ui/button";
import { Palette, Scissors, Volume2, FileText } from "lucide-react";
import { formatTimeCode } from "@/lib/utils";
import { Comment, CommentActions } from "../types";

export const CommentPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentFrame: number;
  fps: number;
  comments: Comment[];
  onAddComment: (text: string, actions: CommentActions) => void;
}> = ({ isOpen, onClose, currentFrame, fps, comments, onAddComment }) => {
  const [commentText, setCommentText] = useState("");
  const [actions, setActions] = useState<CommentActions>({
    color: false,
    trim: false,
    voice: false,
    script: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(commentText, actions);
      setCommentText("");
      setActions({ color: false, trim: false, voice: false, script: false });
    }
  };

  const toggleAction = (action: keyof CommentActions) => {
    setActions((prev) => ({ ...prev, [action]: !prev[action] }));
  };

  return (
    <RightTray
      isOpen={isOpen}
      onClose={onClose}
      title="Add Comment"
      subtitle={`at ${formatTimeCode(currentFrame, fps)}`}
    >
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Enter your comment..."
            className="w-full bg-input text-foreground px-3 py-2 rounded-md min-h-[100px] mb-4"
          />

          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              What needs to be changed?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={actions.color ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAction("color")}
                className="flex items-center gap-1"
              >
                <Palette className="w-4 h-4" />
                <span>Color</span>
              </Button>
              <Button
                type="button"
                variant={actions.trim ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAction("trim")}
                className="flex items-center gap-1"
              >
                <Scissors className="w-4 h-4" />
                <span>Trim</span>
              </Button>
              <Button
                type="button"
                variant={actions.voice ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAction("voice")}
                className="flex items-center gap-1"
              >
                <Volume2 className="w-4 h-4" />
                <span>Voice</span>
              </Button>
              <Button
                type="button"
                variant={actions.script ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAction("script")}
                className="flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span>Script</span>
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Add Comment
          </Button>
        </form>

        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Existing Comments</h3>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-card rounded-lg p-3 border border-border"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {formatTimeCode(comment.timestamp, fps)}
                </div>
                <div className="text-foreground">{comment.text}</div>
                {/* Show selected actions */}
                {comment.actions && (
                  <div className="flex gap-1 mt-2">
                    {comment.actions.color && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-foreground bg-secondary">
                        <Palette className="w-3 h-3 mr-1" />
                        Color
                      </span>
                    )}
                    {comment.actions.trim && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-foreground bg-secondary">
                        <Scissors className="w-3 h-3 mr-1" />
                        Trim
                      </span>
                    )}
                    {comment.actions.voice && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-foreground bg-secondary">
                        <Volume2 className="w-3 h-3 mr-1" />
                        Voice
                      </span>
                    )}
                    {comment.actions.script && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-foreground bg-secondary">
                        <FileText className="w-3 h-3 mr-1" />
                        Script
                      </span>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(comment.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RightTray>
  );
};
