import axios, { AxiosResponse, AxiosError } from "axios";
import { getOrCreateSessionKey } from "@/lib/session";

// Create the main API client
export const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for authentication and session handling
apiClient.interceptors.request.use((config) => {
  const sessionKey = getOrCreateSessionKey();

  // Get CSRF token from cookies
  const csrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1] || "";

  // Add CSRF token to headers
  config.headers["X-CSRFToken"] = csrfToken;
  config.headers["X-DD-Session-Key"] = sessionKey;

  // Only modify JSON requests, not FormData requests
  if (config.headers["Content-Type"] !== "multipart/form-data") {
    if (config.data) {
      // If request has a body, add session key to it
      config.data = { ...config.data, session_key: sessionKey };
    } else {
      // If request has no body, create one with session key
      config.data = { session_key: sessionKey };
    }
  }

  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      console.warn('Unauthorized request');
    } else if (error.response && error.response.status >= 500) {
      // Handle server errors
      console.error('Server error:', error);
    }
    
    return Promise.reject(error);
  }
);

// Generic API function types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Generic API functions
export const api = {
  get: <T>(url: string, params?: Record<string, any>) =>
    apiClient.get<T>(url, { params }),
  
  post: <T>(url: string, data?: any) =>
    apiClient.post<T>(url, data),
  
  put: <T>(url: string, data?: any) =>
    apiClient.put<T>(url, data),
  
  patch: <T>(url: string, data?: any) =>
    apiClient.patch<T>(url, data),
  
  delete: <T>(url: string) =>
    apiClient.delete<T>(url),
};

// Keep the old export for backward compatibility during migration
export const ddApiClient = apiClient;