import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import DNAsPage from "./pages/DNAsPage";
import VslMakerPage from "./pages/VslMakerPage";
import AdsAgentPage from "./pages/AdsAgentPage";
import ReferencesPage from "./pages/ReferencesPage";
import VideoInspirationPage from "./pages/VideoInspirationPage";
import CompetitorsPage from "./pages/CompetitorsPage";
import OrganicPostsPage from "./pages/OrganicPostsPage";
import RunsPage from "./pages/RunsPage";
import ReferentesPage from "./pages/ReferentesPage";
import ContentBankPage from "./pages/ContentBankPage";
import ModeledScriptsPage from "./pages/ModeledScriptsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dnas" element={<DNAsPage />} />
          <Route path="/vsl" element={<VslMakerPage />} />
          <Route path="/ads-agent" element={<AdsAgentPage />} />
          <Route path="/references" element={<ReferencesPage />} />
          <Route path="/video-inspiration" element={<VideoInspirationPage />} />
          <Route path="/competitors" element={<CompetitorsPage />} />
          <Route path="/organic-posts" element={<OrganicPostsPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/referentes" element={<ReferentesPage />} />
          <Route path="/content-bank" element={<ContentBankPage />} />
          <Route path="/scripts" element={<ModeledScriptsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
