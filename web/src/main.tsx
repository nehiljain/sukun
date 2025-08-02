import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { SidebarProvider } from "./hooks/use-sidebar.tsx";
import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";
import "./global.css";

const options = {
  api_host: import.meta.env.VITE_REACT_APP_PUBLIC_POSTHOG_HOST,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <PostHogProvider
        apiKey={import.meta.env.VITE_REACT_APP_PUBLIC_POSTHOG_KEY}
        options={options}
      >
        <SidebarProvider>
          <TooltipProvider delayDuration={100}>
            <AppRouter />
          </TooltipProvider>
        </SidebarProvider>
      </PostHogProvider>
    </AppProviders>
  </StrictMode>,
);
