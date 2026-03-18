import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import DNAsPage from "./pages/DNAsPage";
import VslMakerPage from "./pages/VslMakerPage";
import AdsAgentPage from "./pages/AdsAgentPage";
import ReferencesPage from "./pages/ReferencesPage";
import VideoInspirationPage from "./pages/VideoInspirationPage";
import CompetitorsPage from "./pages/CompetitorsPage";
import RunsPage from "./pages/RunsPage";
import ReferentesPage from "./pages/ReferentesPage";
import ModeledScriptsPage from "./pages/ModeledScriptsPage";
import SurveyAnalysisPage from "./pages/SurveyAnalysisPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dnas" replace />} />
            <Route path="/dnas" element={<DNAsPage />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route path="/referentes" element={<ReferentesPage />} />
            <Route path="/video-inspiration" element={<VideoInspirationPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/ads-agent" element={<AdsAgentPage />} />
            <Route path="/vsl" element={<VslMakerPage />} />
            <Route path="/scripts" element={<ModeledScriptsPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/surveys" element={<SurveyAnalysisPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
