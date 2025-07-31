import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface VerificationBannerProps {
  email: string;
  isVerified: boolean;
  onResendVerification: () => Promise<void>;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({
  email,
  isVerified,
  onResendVerification,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Reset dismissed state if verification status changes
  useEffect(() => {
    setDismissed(false);
  }, [isVerified]);

  if (isVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResendVerification();
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert variant="warning" className="relative mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          Please verify your email address ({email}) to access all features.
          <Button
            variant="link"
            onClick={handleResend}
            disabled={isResending}
            className="p-0 ml-2 h-auto text-primary"
          >
            {isResending ? "Sending..." : "Resend verification email"}
          </Button>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-8 w-8"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default VerificationBanner;
