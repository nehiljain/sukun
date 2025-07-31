import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface NavButton {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "primary" | "secondary" | "ghost" | "link";
}

interface NavbarProps {
  buttons?: NavButton[];
}

export default function Navbar({ buttons = [] }: NavbarProps) {
  return (
    <header className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] md:w-2/3 mx-auto">
      <div className="flex items-center justify-between px-6 py-3 bg-secondary/80 backdrop-blur-sm rounded-full shadow-md">
        <div className="flex items-center space-x-2 w-1/3">
          <Link to="/">
            <img
              src="/static/logo.svg"
              alt="Gestral"
              className="h-8 w-auto"
            />
          </Link>
          <Link to="/">
            <span className="text-2xl font-semibold text-foreground">
              Gestral
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex space-x-6 justify-center w-1/3"></nav>
        <div className="w-1/3 flex justify-end gap-2">
          {buttons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant || "primary"}
              onClick={button.onClick}
              className="h-10 text-base font-semibold"
            >
              {button.icon && <button.icon className="w-5 h-5 mr-2" />}
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
