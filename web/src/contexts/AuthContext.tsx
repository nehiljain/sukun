import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Organization, User } from "../types/user";
import { useCSRFToken } from "@/hooks/use-csrf-token";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  getActiveOrganization: () => Organization | null;
  setActiveOrganization: (organization: Organization) => Promise<void>;
  fetchUser: () => Promise<User | null>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const csrfToken = useCSRFToken();

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/users`, {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          name: userData.name,
          email: userData.email,
          date_joined: userData.date_joined,
          isEmailVerified: userData.is_email_verified,
          profile_image_url: userData.profile_image_url,
          companyRole: userData.company_role,
          usageReason: userData.usage_reason,
          organizations: userData.organizations,
          active_org: userData.active_org,
          permissions: userData.permissions,
          has_subscription_access: userData.has_subscription_access,
          stripe_customer_id: userData.stripe_customer_id,
          stripe_price_id: userData.stripe_price_id,
          subscription_renewal_date: userData.subscription_renewal_date,
          is_staff: userData.is_staff,
        });
        setPermissions(userData.permissions || []);
        return userData;
      } else {
        setUser(null);
        setPermissions([]);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUser(null);
      setPermissions([]);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string) => {
    return permissions.includes(permission) || (user?.is_staff ?? false);
  };

  const getActiveOrganization = () => {
    return (
      user?.organizations?.find(
        (org) => org.organization_id === user?.active_org,
      ) || null
    );
  };

  const setActiveOrganization = async (organization: Organization) => {
    if (user) {
      try {
        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrftoken="))
          ?.split("=")[1];

        const response = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          body: JSON.stringify({
            organization_id: organization.organization_id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update active organization");
        }

        setUser({ ...user, active_org: organization.organization_id });
      } catch (error) {
        console.error("Error updating active organization:", error);
        throw error;
      }
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const response = await fetch(`${baseUrl}/users/resend-verification/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to resend verification email");
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Check if user has completed onboarding
  const isOnboarded = !!user && !!user.companyRole && !!user.usageReason;

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isLoading,
    isOnboarded,
    permissions,
    hasPermission,
    getActiveOrganization,
    setActiveOrganization,
    fetchUser,
    resendVerificationEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
