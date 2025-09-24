import { Routes, Route } from "react-router-dom";

import AuthenticatedLayout from "@/authenticated-layout";
import Layout from "@/layout";

// Open Pages
import LandingPage from "@/pages/open/landing";
import Terms from "@/pages/open/terms";
import Privacy from "@/pages/open/privacy";
import Showcase from "@/pages/open/showcase";
import NotFound from "@/pages/open/NotFound";

// Authenticated User Pages
import Settings from "@/pages/settings";
import Billing from "@/pages/billing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import OnboardingPage from "@/pages/onboarding";
import VerifyEmailCallback from "@/pages/verify-email-callback";

// Video App Pages
import VideoPlayer from "@/pages/open/external-video-player";
import VideoProjects from "@/pages/video/video-projects";
import VideoProjectEntry from "@/pages/video/video-project-entry";
import MediaLibrary from "@/pages/medias/media-library";
import RenderVideoPage from "@/pages/video/render-video";
import MediaEntry from "@/pages/medias/media-entry";

// Gmail Integration Pages
import GmailDashboard from "@/pages/gmail-dashboard";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/verify-email" element={<VerifyEmailCallback />} />
      <Route path="/video-player/:video_id" element={<VideoPlayer />} />
      <Route path="/gallery" element={<Showcase />} />
      <Route path="/showcase" element={<Showcase />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/open/" element={<Layout />}>
      </Route>
      <Route path="/" element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/video-projects" element={<VideoProjects />} />
        <Route
          path="/video-projects/:project_id"
          element={<VideoProjectEntry />}
        />
        <Route path="/media-library" element={<MediaLibrary />} />
        <Route
          path="/render-videos/:render_video_id"
          element={<RenderVideoPage />}
        />
        <Route path="/medias/:media_id" element={<MediaEntry />} />
        <Route path="/gmail" element={<GmailDashboard />} />
      </Route>
      {/* 404 route - must be last to catch all unmatched routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
