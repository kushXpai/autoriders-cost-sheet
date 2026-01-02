// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
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

// ✅ Data Router configuration
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/", element: <Navigate to="/dashboard" replace /> },

  {
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/cost-sheets", element: <CostSheets /> },
      { path: "/cost-sheets/new", element: <CostSheetForm /> },
      { path: "/cost-sheets/:id", element: <CostSheetDetail /> },
      { path: "/cost-sheets/:id/edit", element: <CostSheetForm /> },
      { path: "/vehicles", element: <Vehicles /> },
      { path: "/fuel-rates", element: <FuelRates /> },
      { path: "/interest-rate", element: <ProtectedRoute requireSuperAdmin><InterestRate /></ProtectedRoute> },
      { path: "/insurance-rate", element: <ProtectedRoute requireSuperAdmin><InsuranceRate /></ProtectedRoute> },
      { path: "/admin-charges", element: <ProtectedRoute requireSuperAdmin><AdminCharges /></ProtectedRoute> },
      { path: "/email-settings", element: <ProtectedRoute requireAdmin><EmailSettings /></ProtectedRoute> },
      { path: "/users", element: <ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute> },
    ],
  },

  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        {/* ✅ Use RouterProvider instead of BrowserRouter */}
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
