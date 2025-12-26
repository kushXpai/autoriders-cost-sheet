// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import FuelRates from "@/pages/FuelRates";
import InterestRate from "@/pages/InterestRate";
import InsuranceRate from "@/pages/InsuranceRate";
import AdminCharges from "@/pages/AdminCharges";
import EmailSettings from "@/pages/EmailSettings";
import UserManagement from "@/pages/UserManagement";
import CostSheets from "@/pages/CostSheets";
import CostSheetForm from "@/pages/CostSheetForm";
import CostSheetDetail from "@/pages/CostSheetDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cost-sheets" element={<CostSheets />} />
              <Route path="/cost-sheets/new" element={<CostSheetForm />} />
              <Route path="/cost-sheets/:id" element={<CostSheetDetail />} />
              <Route path="/cost-sheets/:id/edit" element={<CostSheetForm />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/fuel-rates" element={<FuelRates />} />
              <Route path="/interest-rate" element={<ProtectedRoute requireSuperAdmin><InterestRate /></ProtectedRoute>} />
              <Route path="/insurance-rate" element={<ProtectedRoute requireSuperAdmin><InsuranceRate /></ProtectedRoute>} />
              <Route path="/admin-charges" element={<ProtectedRoute requireSuperAdmin><AdminCharges /></ProtectedRoute>} />
              <Route path="/email-settings" element={<ProtectedRoute requireAdmin><EmailSettings /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
