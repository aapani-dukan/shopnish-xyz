import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import "./index.css";

// Pages
import HomePage from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import AuthPage from "@/pages/auth";
import SellerDashboard from "@/pages/seller-dashboard";
import SellerApplyPage from "@/pages/seller-apply";
import SellerStatusPage from "@/pages/seller-status";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryDashboard from "@/pages/delivery-dashboard";
import DeliveryApplyPage from "@/pages/delivery-apply";

// Centralized auth-based routing
import AuthRedirectGuard from "@/components/auth-redirect-guard";
import AdminGuard from "@/components/admin-guard"; // ✅ नया इंपोर्ट
import AdminLogin from "@/pages/admin-login";

function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* Protected - Normal Auth */}
      <Route
        path="/seller-dashboard"
        element={
          <AuthRedirectGuard>
            <SellerDashboard />
          </AuthRedirectGuard>
        }
      />
      <Route
        path="/seller-apply"
        element={
          <AuthRedirectGuard>
            <SellerApplyPage />
          </AuthRedirectGuard>
        }
      />
      <Route
        path="/seller-status"
        element={
          <AuthRedirectGuard>
            <SellerStatusPage />
          </AuthRedirectGuard>
        }
      />
      <Route
        path="/delivery-dashboard"
        element={
          <AuthRedirectGuard>
            <DeliveryDashboard />
          </AuthRedirectGuard>
        }
      />
      <Route
        path="/delivery-apply"
        element={
          <AuthRedirectGuard>
            <DeliveryApplyPage />
          </AuthRedirectGuard>
        }
      />

      {/* Protected - Admin */}
      <Route
        path="/admin-dashboard"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
