import { LucideIcon } from "lucide-react";
import { CommandContext } from "@/hooks/use-commands";
import { XYPosition } from "reactflow";

// Types shared across components
export interface MediaContent {
  type: "video";
  id: string;
  url: string;
  thumbnail_url: string;
}

export interface NodeData {
  title: string;
  description: string;
  duration: number;
  narration: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: XYPosition;
  data: NodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface StoryboardData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ChatMessage {
  sender: "user" | "system" | "assistant";
  message: string;
  timestamp: string;
  media?: MediaContent;
  type?: "text" | "storyboard" | "command" | "agent";
  storyboard_data?: StoryboardData;
  command_data?: CommandContext;
  metadata?: {
    used_tools?: string[];
    [key: string]: any;
  };
}

export interface QuickOption {
  icon: LucideIcon;
  text: string;
}

export interface CommandMenuPosition {
  top: string;
  left: string;
}

// Re-export CommandContext from use-commands for use throughout the chat module
export type { CommandContext };
