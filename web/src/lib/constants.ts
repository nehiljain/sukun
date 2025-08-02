// API endpoints
export const API_ENDPOINTS = {
  // Auth
  USERS: '/api/users',
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  SIGNUP: '/api/signup',
  RESEND_VERIFICATION: '/api/resend-verification-email',
  
  // Media
  MEDIA_LIBRARY: '/api/media/library',
  MEDIA_SEARCH: '/api/media/search',
  MEDIA_DETAIL: (id: string) => `/api/media/${id}`,
  MEDIA_SPLIT: (id: string) => `/api/media/${id}/split_to_portrait`,
  
  // Dashboard
  VIDEO_PROJECTS: '/api/video-projects',
  TEMPLATES: '/api/templates',
  ASSIGN_PROJECTS: '/api/assign-projects',
} as const;

// Query keys
export const QUERY_KEYS = {
  AUTH_USER: 'auth-user',
  MEDIA_LIBRARY: 'media-library',
  MEDIA_SEARCH: 'media-search',
  DASHBOARD: 'dashboard',
  VIDEO_PROJECTS: 'video-projects',
  TEMPLATES: 'templates',
} as const;

// App constants
export const APP_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  DEBOUNCE_DELAY: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes
} as const;