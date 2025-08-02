import { useQuery, useMutation } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard-api';

const DASHBOARD_QUERY_KEY = 'dashboard';

export function useDashboard() {
  // Get recent projects
  const {
    data: recentProjects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, 'recent-projects'],
    queryFn: () => dashboardApi.getRecentProjects(4),
  });

  // Get templates
  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, 'templates'],
    queryFn: dashboardApi.getTemplates,
  });

  // Assign projects mutation
  const assignProjectsMutation = useMutation({
    mutationFn: dashboardApi.assignProjects,
    onError: (error) => {
      console.error('Error assigning projects:', error);
    },
  });

  const isLoading = isLoadingProjects || isLoadingTemplates;
  const error = projectsError || templatesError;

  return {
    recentProjects,
    templates,
    isLoading,
    error,
    assignProjects: assignProjectsMutation.mutate,
    isAssigningProjects: assignProjectsMutation.isPending,
  };
}