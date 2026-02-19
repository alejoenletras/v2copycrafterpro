import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WizardPage from "./pages/WizardPage";
import DashboardPage from "./pages/DashboardPage";
import DNAsPage from "./pages/DNAsPage";
import GeneratedCopyPage from "./pages/GeneratedCopyPage";
import ContentGeneratorPage from "./pages/ContentGeneratorPage";
import AdminStructuresPage from "./pages/AdminStructuresPage";
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
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/copy/:id" element={<GeneratedCopyPage />} />
          <Route path="/content-generator" element={<ContentGeneratorPage />} />
          <Route path="/admin/structures" element={<AdminStructuresPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
