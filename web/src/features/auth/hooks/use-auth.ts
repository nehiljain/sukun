import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from '../api/auth-api';
import type { User, Organization } from '../types';

const AUTH_QUERY_KEY = 'auth-user';

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user query
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: [AUTH_QUERY_KEY],
    queryFn: authApi.getCurrentUser,
    retry: false, // Don't retry on auth failures
  });

  // Set active organization mutation
  const setActiveOrganizationMutation = useMutation({
    mutationFn: authApi.setActiveOrganization,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData([AUTH_QUERY_KEY], updatedUser);
      toast.success('Organization switched successfully');
    },
    onError: (error) => {
      console.error('Error setting active organization:', error);
      toast.error('Failed to switch organization');
    },
  });

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerificationEmail,
    onSuccess: () => {
      toast.success('Verification email sent successfully');
    },
    onError: (error) => {
      console.error('Error resending verification email:', error);
      toast.error('Failed to resend verification email');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData([AUTH_QUERY_KEY], null);
      queryClient.clear(); // Clear all cached data
      window.location.href = '/'; // Redirect to home
    },
    onError: (error) => {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    },
  });

  // Computed values
  const isAuthenticated = !!user;
  const isOnboarded = !!(user?.companyRole && user?.usageReason);
  const permissions = user?.permissions || [];

  // Helper functions
  const hasPermission = (permission: string) => {
    return permissions.includes(permission) || user?.is_staff;
  };

  const getActiveOrganization = (): Organization | null => {
    return user?.organizations?.find(
      (org) => org.organization_id === user?.active_org
    ) || null;
  };

  const setUser = (newUser: User | null) => {
    queryClient.setQueryData([AUTH_QUERY_KEY], newUser);
  };

  return {
    user,
    setUser,
    isAuthenticated,
    isLoading,
    isOnboarded,
    permissions,
    hasPermission,
    getActiveOrganization,
    setActiveOrganization: setActiveOrganizationMutation.mutate,
    fetchUser: refetchUser,
    resendVerificationEmail: resendVerificationMutation.mutate,
    logout: logoutMutation.mutate,
    // Loading states
    isSettingOrganization: setActiveOrganizationMutation.isPending,
    isSendingVerification: resendVerificationMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}