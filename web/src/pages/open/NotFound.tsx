import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { Home } from "lucide-react";

interface NavButton {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant: "primary" | "secondary";
}
const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleGoHome();
    }
  };

  const navButtons: NavButton[] = [
    {
      label: "Back Home",
      icon: Home,
      onClick: handleGoHome,
      variant: "primary" as const,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar buttons={navButtons} />

      <main className="flex flex-col items-center justify-center flex-grow px-4 pt-24 pb-12">
        <div className="text-center max-w-md">
          <h1 className="text-9xl font-bold text-foreground">404</h1>
          <div className="my-6 h-1 w-20 bg-accent mx-auto rounded-full"></div>
          <h2 className="text-3xl font-heading font-semibold mb-4 text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
