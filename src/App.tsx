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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
