import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, UserRound, Briefcase, Play } from "lucide-react";
import { useCSRFToken } from "@/hooks/use-csrf-token";
import { useAuth } from "@/contexts/AuthContext";

type SignupFlowProps = {
  userId: string;
  email: string;
  name: string;
  onComplete: () => void;
};

type StepProps = {
  onNext: (data: any) => void;
  defaultValue?: string;
};

const NameStep: React.FC<StepProps> = ({ onNext, defaultValue = "" }) => {
  const [name, setName] = useState(defaultValue);

  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <CardHeader className="pb-3">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-4">
            <UserRound className="h-8 w-8 text-accent" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          Welcome to DemoDrive!
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-2">
          Let's get you set up. What's your name?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="border-input focus:border-accent focus:ring-accent"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onNext({ name })}
          disabled={!name.trim()}
          variant="primary"
          className="w-full"
        >
          Continue
        </Button>
      </CardFooter>
    </div>
  );
};

const RoleStep: React.FC<StepProps> = ({ onNext, defaultValue = "" }) => {
  const [role, setRole] = useState(defaultValue);

  const roles = [
    { value: "marketing", label: "Marketing" },
    { value: "developer_relations", label: "Developer Relations" },
    { value: "sales", label: "Sales" },
    { value: "content_creator", label: "Content Creator" },
  ];

  return (
    <div className="space-y-4">
      <CardHeader className="pb-3">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-4">
            <Briefcase className="h-8 w-8 text-accent" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          What's your role?
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-2">
          Your primary role at your company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={role} onValueChange={setRole} className="space-y-3">
          {roles.map((roleOption) => (
            <div
              key={roleOption.value}
              className="flex items-center space-x-2 border border-border p-3 rounded-md hover:bg-secondary cursor-pointer"
            >
              <RadioGroupItem
                value={roleOption.value}
                id={roleOption.value}
                className="text-accent"
              />
              <Label
                htmlFor={roleOption.value}
                className="flex-grow cursor-pointer"
              >
                {roleOption.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onNext({ company_role: role })}
          disabled={!role}
          variant="primary"
          className="w-full"
        >
          Continue
        </Button>
      </CardFooter>
    </div>
  );
};

const UsageStep: React.FC<StepProps> = ({ onNext, defaultValue = "" }) => {
  const [usage, setUsage] = useState(defaultValue);

  const usageReasons = [
    { value: "less_than_5", label: "Less than 5 videos" },
    { value: "5_to_10", label: "5 to 10 videos" },
    { value: "11_to_20", label: "11 to 20 videos" },
    { value: "more_than_20", label: "More than 20 videos" },
  ];

  return (
    <div className="space-y-4">
      <CardHeader className="pb-3">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-4">
            <Play className="h-8 w-8 text-accent" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          How many videos do you plan to create every month?
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-2">
          This helps us customize your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={usage}
          onValueChange={setUsage}
          className="space-y-3"
        >
          {usageReasons.map((reason) => (
            <div
              key={reason.value}
              className="flex items-center space-x-2 border border-border p-3 rounded-md hover:bg-secondary cursor-pointer"
            >
              <RadioGroupItem
                value={reason.value}
                id={reason.value}
                className="text-accent"
              />
              <Label
                htmlFor={reason.value}
                className="flex-grow cursor-pointer"
              >
                {reason.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onNext({ usage_reason: usage })}
          disabled={!usage}
          variant="primary"
          className="w-full"
        >
          Continue
        </Button>
      </CardFooter>
    </div>
  );
};

const VerificationStep: React.FC<{ email: string; onComplete: () => void }> = ({
  email,
  onComplete,
}) => {
  return (
    <div className="space-y-4">
      <CardHeader className="pb-3">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-accent/20 p-4">
            <Check className="h-8 w-8 text-accent" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          Verify your email
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-2">
          We've sent a verification link to {email}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <p className="text-center text-muted-foreground">
          Please check your inbox and click the verification link. You can
          continue to your dashboard now, but some features may be limited until
          you verify your email.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={onComplete} variant="primary" className="w-full">
          Go to Dashboard
        </Button>
      </CardFooter>
    </div>
  );
};

const SignupFlow: React.FC<SignupFlowProps> = ({
  userId,
  email,
  name,
  onComplete,
}) => {
  const [step, setStep] = useState(name ? 1 : 0);
  const [userData, setUserData] = useState({
    name,
    company_role: "",
    usage_reason: "",
  });
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const csrfToken = useCSRFToken();

  const handleNext = async (data: any) => {
    const updatedUserData = { ...userData, ...data };
    setUserData(updatedUserData);
    if (step === 2) {
      try {
        // Save all user data on the final step
        const response = await fetch(`${baseUrl}/users/onboarding/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify(updatedUserData),
        });

        if (!response.ok) {
          throw new Error("Failed to update user information");
        }

        // Move to verification step
        setStep(step + 1);
      } catch (error) {
        console.error("Error updating user information:", error);
      }
    } else {
      // Just move to the next step
      setStep(step + 1);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-border shadow-lg">
      {step === 0 && (
        <NameStep onNext={handleNext} defaultValue={userData.name} />
      )}
      {step === 1 && (
        <RoleStep onNext={handleNext} defaultValue={userData.company_role} />
      )}
      {step === 2 && (
        <UsageStep onNext={handleNext} defaultValue={userData.usage_reason} />
      )}
      {step === 3 && <VerificationStep email={email} onComplete={onComplete} />}
    </Card>
  );
};

export default SignupFlow;
