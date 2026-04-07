import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
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
import BrandChatPage from "./pages/BrandChatPage";
import AdSpyPage from "./pages/AdSpyPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import ClearCachePopup from "@/components/ClearCachePopup";

import { queryClient } from "@/lib/queryClient";

/** Redirects to /login if not authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Only accessible by admin users */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const ADMIN_EMAILS = ['alejoenletras@gmail.com'];
  const isAdminByEmail = user?.email ? ADMIN_EMAILS.includes(user.email) : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAdmin && !isAdminByEmail) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ClearCachePopup />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
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
              <Route path="/ad-spy" element={<AdSpyPage />} />
              <Route path="/brand-chat" element={<BrandChatPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
