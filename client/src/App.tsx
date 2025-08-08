// client/src/App.tsx

import { Routes, Route, Navigate } from "react-router-dom";
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
import { AuthRedirectGuard } from "@/components/auth-redirect-guard";
import AdminLogin from "@/pages/admin-login";

// ✅ अब हमें इसकी ज़रूरत नहीं है क्योंकि हम `AuthRedirectGuard` को सीधे राउट्स पर इस्तेमाल करेंगे
// const PrivateRoute = ...

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      
      {/* ✅ यह है नया और सही तरीका। 
        हम `AuthRedirectGuard` को सभी प्रोटेक्टेड राउट्स के लिए एक ही बार में लागू कर रहे हैं।
      */}
      <Route element={<AuthRedirectGuard />}>
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        <Route path="/seller-apply" element={<SellerApplyPage />} />
        <Route path="/seller-status" element={<SellerStatusPage />} />
        <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
        <Route path="/delivery-apply" element={<DeliveryApplyPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Route>

      {/* ✅ सार्वजनिक राउट्स जो ऑथेंटिकेशन के बिना काम करते हैं */}
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
