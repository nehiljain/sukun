import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import posthog from "posthog-js";
import { PageLoader } from "./components/ui/page-loader";

const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Identify user with PostHog if they exist
  if (user) {
    posthog.identify(user.name, {
      email: user.email,
      name: user.name,
    });
  }

  // While checking authentication status, show a loading indicator
  if (isLoading) {
    return <PageLoader />;
  }

  // If authenticated, render the Layout with its child routes
  return (
    <div className="flex">
      <Toaster />
      {/* <AdminPanelLayout> */}
      <main className="flex-1">
        <Outlet />
      </main>
      {/* </AdminPanelLayout> */}
    </div>
  );
};

export default Layout;
