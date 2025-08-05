import axios from "axios";
import { getOrCreateSessionKey } from "@/lib/session";

// Create an axios instance for API calls
export const ddApiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Add session key and CSRF token to all requests
ddApiClient.interceptors.request.use((config) => {
  const sessionKey = getOrCreateSessionKey();

  // Get CSRF token from cookies
  const csrfToken =
    document.cookie
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
