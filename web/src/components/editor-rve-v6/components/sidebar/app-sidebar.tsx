"use client";

import * as React from "react";
import {
  Film,
  Music,
  Type,
  Subtitles,
  ImageIcon,
  Square,
  Video,
  MousePointer,
} from "lucide-react";
// import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "../../contexts/sidebar-context";
import { Link } from "react-router-dom";
import { OverlayType } from "../../types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorConfig } from "../../contexts/editor-config-context";

/**
 * AppSidebar Component
 *
 * A dual-sidebar layout component for the video editor application.
 * Consists of two parts:
 * 1. A narrow icon-based sidebar on the left for main navigation
 * 2. A wider content sidebar that displays the active panel's content
 *
 * @component
 * @param props - Props extending from the base Sidebar component
 */
export function AppSidebar() {
  const { activePanel, setActivePanel, setIsOpen } = useSidebar();
  const { isOverlayEnabled } = useEditorConfig();

  const getPanelTitle = (type: OverlayType): string => {
    switch (type) {
      case OverlayType.VIDEO:
        return "Video";
      case OverlayType.TEXT:
        return "Text";
      case OverlayType.SOUND:
        return "Audio";
      case OverlayType.CAPTION:
        return "Caption";
      case OverlayType.IMAGE:
        return "Image";
      case OverlayType.RECTANGLE:
        return "Rectangle";
      case OverlayType.WEBCAM:
        return "Webcam";
      case OverlayType.BUTTON_CLICK:
        return "Button Click";
      default:
        return "Unknown";
    }
  };

  // Base navigation items with their configurations
  const allNavigationItems = [
    {
      title: getPanelTitle(OverlayType.VIDEO),
      url: "#",
      icon: Film,
      panel: OverlayType.VIDEO,
      type: OverlayType.VIDEO,
    },
    {
      title: getPanelTitle(OverlayType.IMAGE),
      url: "#",
      icon: ImageIcon,
      panel: OverlayType.IMAGE,
      type: OverlayType.IMAGE,
    },
    {
      title: getPanelTitle(OverlayType.TEXT),
      url: "#",
      icon: Type,
      panel: OverlayType.TEXT,
      type: OverlayType.TEXT,
    },
    {
      title: getPanelTitle(OverlayType.SOUND),
      url: "#",
      icon: Music,
      panel: OverlayType.SOUND,
      type: OverlayType.SOUND,
    },
    {
      title: getPanelTitle(OverlayType.CAPTION),
      url: "#",
      icon: Subtitles,
      panel: OverlayType.CAPTION,
      type: OverlayType.CAPTION,
    },
    {
      title: getPanelTitle(OverlayType.RECTANGLE),
      url: "#",
      icon: Square,
      panel: OverlayType.RECTANGLE,
      type: OverlayType.RECTANGLE,
    },
    {
      title: getPanelTitle(OverlayType.WEBCAM),
      url: "#",
      icon: Video,
      panel: OverlayType.WEBCAM,
      type: OverlayType.WEBCAM,
    },
    {
      title: getPanelTitle(OverlayType.BUTTON_CLICK),
      url: "#",
      icon: MousePointer,
      panel: OverlayType.BUTTON_CLICK,
      type: OverlayType.BUTTON_CLICK,
    },
  ];

  // Filter navigation items based on enabled overlays
  const navigationItems = allNavigationItems.filter((item) =>
    isOverlayEnabled(item.type as OverlayType),
  );

  return (
    <Sidebar
      collapsible="none"
      className="!w-[80px] bg-background border-r border-border"
    >
      <SidebarHeader className="py-6 px-4 bg-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-12 md:p-0">
              <Link
                to="/video-projects"
                className="flex items-center justify-center"
              >
                <div className="flex aspect-square size-16 items-center justify-center rounded-lg">
                  <img
                    src="/static/logo.svg"
                    alt="Logo"
                    width={80}
                    height={80}
                    className="w-12 h-12"
                  />
                </div>
                <div className="grid flex-1 text-left text-base leading-tight">
                  <span className="truncate font-heading font-semibold text-foreground">
                    React Video Editor
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-background px-3">
        <SidebarGroup className="space-y-3 px-1">
          {navigationItems.map((item) => (
            <TooltipProvider key={item.title} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => {
                      setActivePanel(item.panel);
                      setIsOpen(true);
                    }}
                    size="lg"
                    className={`flex flex-col items-center justify-center gap-1 transition-all duration-200`}
                    aria-label={item.title}
                  >
                    <div
                      className={`flex flex-col items-center justify-center p-2 rounded-md ${
                        activePanel === item.panel
                          ? "bg-white text-accent-foreground hover:bg-white hover:text-accent-foreground"
                          : "text-muted-foreground hover:bg-white hover:text-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5 text-current" />
                    </div>
                    <span
                      className={`text-sm font-medium leading-none mt-1.5 ${
                        activePanel === item.panel
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="border border-border bg-popover text-popover-foreground font-medium"
                >
                  {item.title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </SidebarGroup>
      </SidebarContent>
      {/* <SidebarFooter className="border-t border-border p-3 bg-background">
        <SidebarMenu>
          <div className="flex items-center justify-center">
            <SidebarMenuButton
              asChild
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              <Link to="/">V6</Link>
            </SidebarMenuButton>
          </div>
        </SidebarMenu>
      </SidebarFooter> */}
    </Sidebar>
  );
}
