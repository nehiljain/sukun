import React, { createContext, useContext, ReactNode } from "react";
import { Comment, CommentActions } from "../types";

// Define the context type
type CommentContextType = {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  isCommentPanelOpen: boolean;
  setIsCommentPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddNewComment: (text: string, actions: CommentActions) => void;
  handleTakeAction: () => Promise<void>;
};

// Create the context with a default undefined value
const CommentContext = createContext<CommentContextType | undefined>(undefined);

// Provider component
export const CommentProvider: React.FC<{
  children: ReactNode;
  value: CommentContextType;
}> = ({ children, value }) => {
  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
};

// Custom hook to use the comment context
export const useComments = (): CommentContextType => {
  const context = useContext(CommentContext);
  if (context === undefined) {
    throw new Error("useComments must be used within a CommentProvider");
  }
  return context;
};
