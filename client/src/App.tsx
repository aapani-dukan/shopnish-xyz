// client/src/App.tsx

import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip"; // ✅ TooltipProvider को इंपोर्ट करें

// Layouts and components
import Header from "./components/header";
import CartModal from "./components/cart-modal";

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
import AdminGuard from "@/components/admin-guard";
import AdminLogin from "@/pages/admin-login";

// ✅ एक मुख्य कंपोनेंट बनाएँ जो सभी लेआउट को रेंडर करे
function App() {
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            {/* ✅ Header and CartModal को Routes के बाहर रेंडर करें */}
            <Header onCartClick={() => setIsCartModalOpen(true)} />
            <main className="min-h-screen">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/admin-login" element={<AdminLogin />} />

                {/* Protected - Normal Auth */}
                <Route path="/seller-dashboard" element={<AuthRedirectGuard><SellerDashboard /></AuthRedirectGuard>} />
                <Route path="/seller-apply" element={<AuthRedirectGuard><SellerApplyPage /></AuthRedirectGuard>} />
                <Route path="/seller-status" element={<AuthRedirectGuard><SellerStatusPage /></AuthRedirectGuard>} />
                <Route path="/delivery-dashboard" element={<AuthRedirectGuard><DeliveryDashboard /></AuthRedirectGuard>} />
                <Route path="/delivery-apply" element={<AuthRedirectGuard><DeliveryApplyPage /></AuthRedirectGuard>} />

                {/* Protected - Admin */}
                <Route path="/admin-dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <CartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
