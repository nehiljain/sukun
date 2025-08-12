import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Loader from "@/components/shared/loader";
import { SuccessToast, ErrorToast } from "@/components/CustomToast";
import { Minus, Plus } from "lucide-react";
import { User, Token } from "@/types/user";

export const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const navigate = useNavigate();

  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;

  useEffect(() => {
    fetchUserData();
    fetchTokens();
  }, []);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/users`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error(<ErrorToast message="Failed to load user data" />);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await fetch(`${baseUrl}/tokens/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tokens");
      }
      const data = await response.json();
      setTokens(data);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  };

  const createToken = async () => {
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}/tokens/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to create token");
      }
      const newToken = await response.json();
      setTokens([...tokens, newToken]);
    } catch (error) {
      console.error("Error creating token:", error);
    }
  };

  const deleteToken = async (key: string) => {
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}/tokens/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete token");
      }
      setTokens(tokens.filter((token) => token.key !== key));
    } catch (error) {
      console.error("Error deleting token:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1];
      const response = await fetch(`${baseUrl}/users`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete account");
      }
      toast.success(<SuccessToast message="Account deleted successfully" />);
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(<ErrorToast message="Failed to delete account" />);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="flex">
      <main className="text-foreground flex-1 p-12 space-y-12">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account information.
          </p>
        </div>

        <Card className="w-full py-10">
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader />
              </div>
            ) : user ? (
              <>
                <p className="mb-4">
                  <strong>Name:</strong> {user.name}
                </p>
                <p className="mb-4">
                  <strong>Email:</strong> {user.email}
                </p>
                <p className="mb-4">
                  <strong>Active Organization:</strong> {user.active_org}
                </p>
                <hr className="my-4" />
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">API Tokens</h3>
                  <div className="flex flex-col gap-2">
                    {tokens.map((token) => (
                      <div
                        key={token.key}
                        className="flex justify-between items-center"
                      >
                        <span>{token.key}</span>
                        <Button
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          variant="destructive"
                          onClick={() => deleteToken(token.key)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      onClick={createToken}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Token
                    </Button>
                  </div>
                </div>
                <hr className="my-4" />
                {/* <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold mb-2">Connections</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span>GitHub</span>
                    <Button variant="outline">Disconnect</Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Slack</span>
                    <Button variant="outline">Disconnect</Button>
                  </div>
                </div>
              </div> */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Account</h3>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete Data</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Account Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete your account? This
                          action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                        >
                          Yes, delete my account
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <p>No user data available.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
