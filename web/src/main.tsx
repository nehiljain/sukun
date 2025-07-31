import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PostHogProvider } from "posthog-js/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Router from "./router";
import "./global.css";
import PageViewTracker from "./contexts/PageTracking.tsx";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { SidebarProvider } from "./hooks/use-sidebar.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";

const options = {
  api_host: import.meta.env.VITE_REACT_APP_PUBLIC_POSTHOG_HOST,
};

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider
          apiKey={import.meta.env.VITE_REACT_APP_PUBLIC_POSTHOG_KEY}
          options={options}
        >
          <PageViewTracker />
          <AuthProvider>
            <SidebarProvider>
              <TooltipProvider delayDuration={100}>
                <Router />
              </TooltipProvider>
            </SidebarProvider>
          </AuthProvider>
        </PostHogProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
