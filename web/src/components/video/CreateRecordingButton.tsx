import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { ddApiClient } from "@/lib/api-client";

interface CreateRecordingButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const CreateRecordingButton: React.FC<CreateRecordingButtonProps> = ({
  variant = "default",
  size = "default",
  className = "",
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinStudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create recording with auto-generated name
      const timestamp = new Date().toLocaleString().replace(/[/,:]/g, "-");
      const response = await ddApiClient.post("/api/recordings/", {
        name: `Recording Session ${timestamp}`,
      });

      // Navigate to the recording studio page
      navigate(`/studio/recording/${response.data.id}`);
    } catch (err) {
      console.error("Failed to join recording studio:", err);
      setError("Failed to join recording studio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleJoinStudio}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Joining...
        </>
      ) : (
        <>
          <Video className="mr-2 h-4 w-4" />
          Join Recording Studio
        </>
      )}
    </Button>
  );
};

export default CreateRecordingButton;
