import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import BrandChatPage from "./pages/BrandChatPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

/** Redirects to /login if not authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isApproved } = useAuth();

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

  // Profile still loading (null) — show spinner briefly, don't redirect
  if (profile === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-500">Cargando perfil...</p>
      </div>
    );
  }

  // Profile loaded but not approved
  if (!isApproved) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-2">Cuenta pendiente</h2>
          <p className="text-zinc-400">Tu cuenta está pendiente de aprobación. Te notificaremos cuando sea aprobada.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Only accessible by admin users */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dnas" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
