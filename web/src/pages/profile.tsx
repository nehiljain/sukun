import React from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

import Loader from "@/components/shared/loader";
import { useAuth } from "@/contexts/AuthContext";

export const Profile: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex container mx-auto py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Please log in to view your profile.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {user && (
              <>
                <p className="mb-4">
                  <strong>Name:</strong> {user.name || "Not available"}
                </p>
                <p className="mb-4">
                  <strong>Email:</strong> {user.email || "Not available"}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
