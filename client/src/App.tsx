// Client/src/App.tsx

import { Routes, Route, Navigate } from "react-router-dom"; // 👈 React Router imports
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
import AuthPage from "@/pages/auth"; // ✅ AuthPage
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

// एक प्राइवेट राउट कंपोनेंट बनाएं जो AuthRedirectGuard का उपयोग करता है
const PrivateRoute = ({ component: Component, redirectTo, ...rest }: { component: React.ComponentType<any>, redirectTo: string, [key: string]: any }) => {
  return (
    <Route {...rest}>
      {(params) => (
        <AuthRedirectGuard redirectTo={redirectTo}>
          <Component {...params} />
        </AuthRedirectGuard>
      )}
    </Route>
  );
};


function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      
      {/* Protected Routes */}
      <Route path="/seller-dashboard" element={
        <AuthRedirectGuard redirectTo="/auth">
          <SellerDashboard />
        </AuthRedirectGuard>
      } />
      <Route path="/seller-apply" element={
        <AuthRedirectGuard redirectTo="/auth">
          <SellerApplyPage />
        </AuthRedirectGuard>
      } />
      <Route path="/seller-status" element={
        <AuthRedirectGuard redirectTo="/auth">
          <SellerStatusPage />
        </AuthRedirectGuard>
      } />
      <Route path="/delivery-dashboard" element={
        <AuthRedirectGuard redirectTo="/auth">
          <DeliveryDashboard />
        </AuthRedirectGuard>
      } />
      <Route path="/delivery-apply" element={
        <AuthRedirectGuard redirectTo="/auth">
          <DeliveryApplyPage />
        </AuthRedirectGuard>
      } />
      <Route path="/admin-dashboard" element={
        <AuthRedirectGuard redirectTo="/admin-login">
          <AdminDashboard />
        </AuthRedirectGuard>
      } />
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
