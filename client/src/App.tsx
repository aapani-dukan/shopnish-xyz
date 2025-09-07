import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SocketProvider } from "@/hooks/useSocket";

// Layouts and components
import Header from "./components/header";
import CartModal from "./components/cart-modal";
import AdminLayout from "@/components/AdminLayout";

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
import DeliveryApplyPage from "@/pages/delivery-apply";
import DeliveryLogin from "@/pages/delivery-login";
import LoginPage from "@/pages/login";
import CategoriesManagement from "@/components/CategoriesManagement";
import AdminLogin from "@/pages/admin-login";
import OrderConfirmation from "@/pages/order-confirmation";
import CustomerOrdersPage from "@/pages/customer/orders";
import Checkout2 from "./pages/checkout2"; 
import DeliveryOrdersList from "@/pages/DeliveryOrdersList";
import { Loader2 } from "lucide-react"; // ✅ Loader2 आइकन जोड़ा गया

// Centralized auth-based routing
import AuthRedirectGuard from "@/components/auth-redirect-guard";
import AdminGuard from "@/components/admin-guard";

// ✅ DeliveryOrdersList को सीधे रेंडर करने के लिए एक Wrapper कंपोनेंट बनाया गया
function DeliveryRouteWrapper() {
  const { authState, isLoadingAuth } = useAuth(); // ✅ isLoadingAuth जोड़ा गया
  const { user, auth } = authState;

  // ✅ जब तक प्रमाणीकरण लोड हो रहा है तब तक लोडिंग स्थिति दिखाएं
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!user) {
    return null; 
  }

  return <DeliveryOrdersList userId={user.uid} auth={auth} />;
}


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
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout2/:id" element={<Checkout2 />} />
                
                
       
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/delivery-login" element={<DeliveryLogin />} />
                {/* Protected - Normal Auth */}
                <Route path="/seller-dashboard" element={<AuthRedirectGuard><SellerDashboard /></AuthRedirectGuard>} />
                <Route path="/seller-apply" element={<AuthRedirectGuard><SellerApplyPage /></AuthRedirectGuard>} />
                <Route path="/seller-status" element={<AuthRedirectGuard><SellerStatusPage /></AuthRedirectGuard>} />
                <Route path="/delivery-dashboard" element={<AuthRedirectGuard><DeliveryRouteWrapper /></AuthRedirectGuard>} />
                <Route path="/delivery-apply" element={<AuthRedirectGuard><DeliveryApplyPage /></AuthRedirectGuard>} />
                <Route path="/customer/orders" element={<AuthRedirectGuard><CustomerOrdersPage /></AuthRedirectGuard>} />
                <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

                {/* Protected - Admin */}
                {/* ✅ एडमिन राउट को AdminLayout के अंदर रखा गया है */}
                <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="categories" element={<CategoriesManagement />} />
                </Route>
                
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
