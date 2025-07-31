"use client";

import { Link } from "react-router-dom";
import { Ellipsis, LogOut, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getMenuList } from "@/lib/menu-list";
import { Button } from "@/components/ui/button";
import { CollapseMenuButton } from "@/components/admin-panel/collapse-menu-button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MenuProps {
  isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
  const location = useLocation();
  const menuList = getMenuList(location.pathname);
  const { user, isLoading, setActiveOrganization, getActiveOrganization } =
    useAuth();

  return (
    // <ScrollArea className="[&>div>div[style]]:!block">
    <nav className="mt-8 h-full w-full">
      <ul className="text-white flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">
        {menuList.map(({ groupLabel, menus }, index) => (
          <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
            {(isOpen && groupLabel) || isOpen === undefined ? (
              <p className="text-sm font-medium text-muted-foreground px-4 pb-2 max-w-[248px] truncate">
                {groupLabel}
              </p>
            ) : !isOpen && isOpen !== undefined && groupLabel ? (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger className="w-full">
                    <div className="w-full flex justify-center items-center">
                      <Ellipsis className="h-5 w-5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{groupLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="pb-2"></p>
            )}
            {menus.map(
              ({ href, label, icon: Icon, active, submenus }, index) =>
                !submenus || submenus.length === 0 ? (
                  <div className="w-full" key={index}>
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={active ? "secondary" : "ghost"}
                            className="w-full justify-start h-10 mb-1"
                            asChild
                          >
                            <Link to={href}>
                              <span
                                className={cn(isOpen === false ? "" : "mr-4")}
                              >
                                <Icon size={18} />
                              </span>
                              <p
                                className={cn(
                                  "max-w-[200px] truncate",
                                  isOpen === false
                                    ? "-translate-x-96 opacity-0"
                                    : "translate-x-0 opacity-100",
                                )}
                              >
                                {label}
                              </p>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        {isOpen === false && (
                          <TooltipContent side="right">{label}</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className="w-full" key={index}>
                    <CollapseMenuButton
                      icon={Icon}
                      label={label}
                      active={active}
                      submenus={submenus}
                      isOpen={isOpen}
                    />
                  </div>
                ),
            )}
          </li>
        ))}
        {!isLoading &&
          user &&
          user.organizations &&
          user.organizations.length > 0 && (
            <li className="w-full pt-5">
              <Select
                disabled={isLoading}
                value={getActiveOrganization()?.organization_id.toString()}
                onValueChange={(value) =>
                  setActiveOrganization(
                    user.organizations.find(
                      (org) => org.organization_id === value,
                    )!,
                  )
                }
              >
                <SelectTrigger
                  className={cn(
                    "w-full bg-background text-sm",
                    isOpen === false ? "opacity-0 hidden" : "opacity-100",
                  )}
                >
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {user.organizations.map((org) => (
                    <SelectItem
                      key={org.organization_id}
                      value={org.organization_id.toString()}
                    >
                      {org.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          )}
        {!isLoading && user && (
          <li className="w-full pt-5">
            <div className="flex items-center space-x-4">
              {user.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt="Profile"
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <User className="h-10 w-10 rounded-full" />
              )}
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isOpen === false ? "opacity-0 hidden" : "opacity-100",
                  )}
                >
                  {user.name}
                </p>
              </div>
            </div>
          </li>
        )}
        <li className="w-full grow flex items-end">
          <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    window.location.href = "/logout";
                  }}
                  variant="outline"
                  className="w-full justify-center h-10 mt-5"
                >
                  <span className={cn(isOpen === false ? "" : "mr-4")}>
                    <LogOut size={18} />
                  </span>
                  <p
                    className={cn(
                      "whitespace-nowrap",
                      isOpen === false ? "opacity-0 hidden" : "opacity-100",
                    )}
                  >
                    Sign out
                  </p>
                </Button>
              </TooltipTrigger>
              {isOpen === false && (
                <TooltipContent side="right">Sign out</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </li>
      </ul>
    </nav>
    // </ScrollArea>
  );
}
