import { api } from "@/lib/api";
import type { User, LoginCredentials, SignupData, AuthResponse, Organization } from "../types";

export const authApi = {
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.host}/api/users`, {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        return {
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
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  },

  // Update active organization
  setActiveOrganization: async (organization: Organization): Promise<User> => {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    const response = await fetch(`${window.location.protocol}//${window.location.host}/api/users`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken || "",
      },
      credentials: "include",
      body: JSON.stringify({
        active_org: organization.organization_id,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update active organization");
    }

    const userData = await response.json();
    return {
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
    };
  },

  // Resend verification email
  resendVerificationEmail: async (): Promise<void> => {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    const response = await fetch(`${window.location.protocol}//${window.location.host}/api/resend-verification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken || "",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to resend verification email");
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    const response = await fetch(`${window.location.protocol}//${window.location.host}/api/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken || "",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to logout");
    }
  },
};