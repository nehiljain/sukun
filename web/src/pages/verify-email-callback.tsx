import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCSRFToken } from "@/hooks/use-csrf-token";
import axios from "axios";

export default function VerifyEmailCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const csrfToken = useCSRFToken();
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL query parameters
        const params = new URLSearchParams(location.search);
        const token = params.get("token");

        if (!token) {
          console.error("No verification token found in URL");
          setStatus("error");
          return;
        }

        // Make API call to verify the token
        const response = await axios.get(`/api/verify-email/?token=${token}`, {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken,
          },
        });

        if (response.status === 200) {
          // Refresh user data to update verification status
          await fetchUser();
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Error during email verification:", error);
        setStatus("error");
      }
    };

    verifyEmail();
  }, []); // Only run when location.search or fetchUser changes

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-center text-muted-foreground">
              Verifying your email...
            </p>
          </CardContent>
        );

      case "success":
        return (
          <>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-accent/20 p-4 mb-4">
                <Check className="h-8 w-8 text-accent" />
              </div>
              <p className="text-center text-muted-foreground">
                Your email has been successfully verified! You now have full
                access to all {import.meta.env.VITE_PROJECT_NAME} features.
              </p>
            </CardContent>
            <div className="flex justify-center p-4">
              <Button variant="primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </>
        );

      case "error":
        return (
          <>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-red-100 p-4 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-center text-muted-foreground">
                Something went wrong while verifying your email. Please try
                again or contact support.
              </p>
            </CardContent>
            <div className="flex justify-center p-4">
              <Button variant="primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md mx-auto border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Email Verification
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground pt-2">
            Verifying your {import.meta.env.VITE_PROJECT_NAME} account
          </CardDescription>
        </CardHeader>
        {renderContent()}
      </Card>
    </div>
  );
}
