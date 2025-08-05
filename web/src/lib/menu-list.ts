import {
  Settings,
  Book,
  LayoutGrid,
  LucideIcon,
  Newspaper,
  Library,
  Video,
  CreditCard,
  Upload,
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          active: pathname.includes("/dashboard"),
          icon: LayoutGrid,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "Video Generation",
      menus: [
        // {
        //   href: "/templates",
        //   label: "Templates",
        //   active: pathname.includes("/templates"),
        //   icon: Newspaper,
        // },
        {
          href: "/video-projects",
          label: "Projects",
          active: pathname.includes("/video-projects"),
          icon: Book,
        },
        // {
        //   href: "/recordings",
        //   label: "Recordings",
        //   active:
        //     pathname.includes("/recordings") ||
        //     pathname.includes("/studio/recording"),
        //   icon: Video,
        // },
        {
          href: "/media-library",
          label: "Media Library",
          active: pathname.includes("/media-library"),
          icon: Library,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "Settings",
      menus: [
        {
          href: "/billing",
          label: "Membership",
          active: pathname.includes("/billing"),
          icon: CreditCard,
        },
        {
          href: "/settings",
          label: "Settings",
          active: pathname.includes("/settings"),
          icon: Settings,
        },
      ],
    },
  ];
}
