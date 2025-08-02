import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Toaster } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import posthog from "posthog-js";
import { PageLoader } from "@/components/ui/page-loader";
import StaffBanner from "@/components/ui/staff-banner";

const AuthenticatedLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading, isOnboarded } = useAuth();
  const location = useLocation();

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

  // If not authenticated, redirect to home page
  if (!isAuthenticated) {
    debugger;
    setTimeout(() => {
      posthog.capture("unauthenticated_access", {
        path: location.pathname,
      });
      return <Navigate to="/" replace />;
    }, 4000);
  }

  // If authenticated but not onboarded, redirect to onboarding page
  // Skip this if we're already on the onboarding page to avoid redirect loops
  if (
    isAuthenticated &&
    !isOnboarded &&
    !location.pathname.includes("/onboarding")
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // If authenticated, render the Layout with its child routes
  return (
    <div className="flex">
      {user?.is_staff && <StaffBanner />}
      <Toaster />
      <AdminPanelLayout>
        <main className={user?.is_staff ? "flex-1 pt-10" : "flex-1"}>
          <Outlet />
        </main>
      </AdminPanelLayout>
    </div>
  );
};

export default AuthenticatedLayout;
