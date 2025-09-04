import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignupFlow from "@/components/auth/SignupFlow";
import { useAuth } from "@/contexts/AuthContext";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, isOnboarded } = useAuth();

  useEffect(() => {
    // If user is already onboarded, redirect to dashboard
    if (!isLoading && isAuthenticated && isOnboarded) {
      navigate("/dashboard");
    }
  }, [isLoading, isAuthenticated, isOnboarded, navigate]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="mb-8">
        <img src="/static/logo.svg" alt={import.meta.env.VITE_PROJECT_NAME} className="h-10 w-auto" />
      </div>
      <SignupFlow
        userId={user.id}
        email={user.email}
        name={user.name}
        onComplete={() => (window.location.href = "/dashboard")}
      />
    </div>
  );
}
