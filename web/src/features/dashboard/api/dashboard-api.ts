import { api } from "@/lib/api";
import type { IVideoProject } from "../types";

export const dashboardApi = {
  // Get recent video projects
  getRecentProjects: async (limit = 4) => {
    const response = await api.get<{ results: IVideoProject[] }>("/api/video-projects/", {
      params: { limit },
    });
    
    return response.data.results.slice(0, limit);
  },

  // Get templates
  getTemplates: async () => {
    const response = await api.get<IVideoProject[]>("/api/templates/");
    
    return response.data;
  },

  // Assign projects (if needed)
  assignProjects: async () => {
    const response = await api.post("/api/assign-projects/");
    
    return response.data;
  },
};