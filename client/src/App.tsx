import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SocketProvider } from "@/hooks/useSocket";

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
import DeliveryDashboard from "@/pages/delivery-dashboard";
import DeliveryApplyPage from "@/pages/delivery-apply";
import DeliveryLogin from "@/pages/delivery-login";
import LoginPage from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import OrderConfirmation from "@/pages/order-confirmation";
import CustomerOrdersPage from "@/pages/customer/orders";

// ✅ Admin components को सही फ़ोल्डर से इम्पोर्ट करें
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin-dashboard";
import CategoriesManagement from "./components/CategoriesManagement";

function App() {
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SocketProvider>
            <Toaster />
            <Header onCartClick={() => setIsCartModalOpen(true)} />
            <main className="min-h-screen">
              <Routes>
                {/* सार्वजनिक मार्ग */}
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/delivery-login" element={<DeliveryLogin />} />
                {/* सुरक्षित - सामान्य Auth */}
                <Route path="/seller-dashboard" element={<AuthRedirectGuard><SellerDashboard /></AuthRedirectGuard>} />
                <Route path="/seller-apply" element={<AuthRedirectGuard><SellerApplyPage /></AuthRedirectGuard>} />
                <Route path="/seller-status" element={<AuthRedirectGuard><SellerStatusPage /></AuthRedirectGuard>} />
                <Route path="/delivery-dashboard" element={<AuthRedirectGuard><DeliveryDashboard /></AuthRedirectGuard>} />
                <Route path="/delivery-apply" element={<AuthRedirectGuard><DeliveryApplyPage /></AuthRedirectGuard>} />
                
                <Route path="/customer/orders" element={<AuthRedirectGuard><CustomerOrdersPage /></AuthRedirectGuard>} />

                {/* सुरक्षित - एडमिन */}
                <Route path="/admin-dashboard" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="categories" element={<CategoriesManagement />} />
                </Route>
                
                <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <CartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
          </SocketProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
