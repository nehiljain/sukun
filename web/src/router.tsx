import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/open/landing";
import Releases from "./pages/releases/releases";
import Comparison from "./pages/releases/comparison";
import Repositories from "./pages/releases/repositories";
import Changelog from "./pages/releases/changelog";
// import ProfilePage from "./pages/profilePage";
import GuideEntry from "./pages/blogchecker/guideEntry";
import Environment from "./pages/blogchecker/environment";
import Guides from "./pages/blogchecker/guides";
import AuthenticatedLayout from "./authenticated-layout";
import Settings from "./pages/settings";
import Billing from "./pages/billing";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/profile";
import Terms from "./pages/open/terms";
import Privacy from "./pages/open/privacy";
import Collections from "./pages/blogchecker/collections";
import Links from "./pages/blogchecker/links";
import CodeRecipe from "./pages/blogchecker/codeRecipe";
import Reports from "./pages/blogchecker/reports";
import ReportEntry from "./pages/open/reportEntry";
import ReportsV2 from "./pages/open/reportEntryv2";
import VideoPlayer from "./pages/open/external-video-player";
import Captures from "./pages/video/captures";
import CodeRecipes from "./pages/blogchecker/codeRecipes";
import CodeRecipeDetail from "./pages/blogchecker/codeRecipeDetail";
import VideoProjects from "./pages/video/video-projects";
import VideoProjectEntry from "./pages/video/video-project-entry";
import RecordingStudio from "./pages/video/recording-studio";
import RecordingsList from "./pages/video/recordings-list";
import BrandAssetsPage from "./pages/video/brandAssets";
import Showcase from "./pages/open/showcase";
import NotFound from "./pages/open/NotFound";
import VideoProjectEditor from "./pages/video/video-project-edit";
import EditorFree from "./pages/open/editor-free";
import MediaLibrary from "./pages/medias/media-library";
import Layout from "./layout";
import OnboardingPage from "./pages/onboarding";
import VerifyEmailCallback from "./pages/verify-email-callback";
import Tourify from "./pages/tourify/index";
import TemplateUsePage from "./pages/templates/use";
import RenderVideoPage from "./pages/video/render-video";
import MediaEntry from "./pages/medias/media-entry";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/verify-email" element={<VerifyEmailCallback />} />
      <Route path="/reports/:report_id" element={<ReportEntry />} />
      <Route path="/reports-v2/:report_id" element={<ReportsV2 />} />
      <Route path="/video-player/:video_id" element={<VideoPlayer />} />
      <Route path="/gallery" element={<Showcase />} />
      <Route path="/showcase" element={<Showcase />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/open/" element={<Layout />}>
        <Route path="/open/editor/:project_id" element={<EditorFree />} />
        <Route path="/open/listing-shorts" element={<Tourify />} />
      </Route>
      <Route path="/" element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/repositories" element={<Repositories />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/comparison/:id" element={<Comparison />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/guides" element={<Guides />} />
        <Route path="/guides/:id" element={<GuideEntry />} />
        <Route
          path="/guides/:id/code-recipes/:recipe_id"
          element={<CodeRecipe />}
        />
        <Route path="/environment" element={<Environment />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:id/links" element={<Links />} />
        <Route path="/captures" element={<Captures />} />
        <Route path="/code-recipes" element={<CodeRecipes />} />
        <Route
          path="/code-recipes/:code_recipe_id"
          element={<CodeRecipeDetail />}
        />
        <Route path="/brand-assets" element={<BrandAssetsPage />} />
        <Route path="/listing-shorts" element={<Tourify />} />
        <Route path="/video-projects" element={<VideoProjects />} />
        <Route
          path="/video-projects/:project_id"
          element={<VideoProjectEntry />}
        />
        <Route
          path="/video-projects/:project_id/editor"
          element={<VideoProjectEditor />}
        />
        <Route
          path="/studio/recording/:recordingId"
          element={<RecordingStudio />}
        />
        <Route path="/studio/recording" element={<RecordingStudio />} />
        <Route path="/recordings" element={<RecordingsList />} />
        <Route path="/media-library" element={<MediaLibrary />} />
        <Route
          path="/templates/:template_id/use"
          element={<TemplateUsePage />}
        />
        <Route
          path="/render-videos/:render_video_id"
          element={<RenderVideoPage />}
        />
        <Route path="/medias/:media_id" element={<MediaEntry />} />
      </Route>
      {/* 404 route - must be last to catch all unmatched routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
