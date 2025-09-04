"use client";
import { Menu } from "@/components/admin-panel/menu";
import { SidebarToggle } from "@/components/admin-panel/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { PanelLeftIcon } from "lucide-react";
import { Link } from "react-router-dom";

export function Sidebar() {
  const sidebar = useSidebar();
  if (!sidebar) return null;
  const { isOpen, toggleOpen, getOpenState, setIsHover, isMobile, settings } =
    sidebar;
  return (
    <>
      {/* Button to open the sidebar on mobile */}
      <Button
        onClick={toggleOpen}
        variant="outline"
        className={cn(
          "fixed text-primary z-30 bottom-4 px-2 left-4 h-10 w-10 justify-center",
          !isMobile ? "hidden" : !getOpenState() ? "block" : "hidden",
          settings.disabled && "hidden",
        )}
        aria-label="Mobile Sidebar"
      >
        <PanelLeftIcon size={24} />
      </Button>

      {/* Sidebar, only visible by default when !isMobile. Else, it's hidden and the mobile button is shown */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-20 h-screen transition-[width] ease-in-out duration-300",
          "bg-background",
          !getOpenState() ? "w-[90px]" : "w-72",
          settings.disabled && "hidden",
          isMobile
            ? getOpenState()
              ? "translate-x-0"
              : "-translate-x-full"
            : !getOpenState()
              ? "lg:w-[90px] -translate-x-full lg:translate-x-0"
              : "lg:w-72 translate-x-0",
        )}
      >
        <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
        <div
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="relative h-full flex flex-col px-3 py-4 shadow-md dark:shadow-zinc-800"
        >
          <Link to="/" className="flex mx-auto items-center gap-2">
            <img
              src="/static/logo.svg"
              alt="Gestral"
              className="h-12 w-auto"
            />
            <h1
              className={cn(
                "font-bold text-lg text-white whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                !getOpenState()
                  ? "-translate-x-96 opacity-0 hidden"
                  : "translate-x-0 opacity-100",
              )}
            >
              Gestral
            </h1>
          </Link>
          <Menu isOpen={getOpenState()} />
        </div>
      </aside>
    </>
  );
}
