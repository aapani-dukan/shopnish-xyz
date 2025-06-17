import { Switch, Route } from "wouter";
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

// ✅ Centralized auth-based routing
import { AuthRedirectGuard } from "@/components/auth-redirect-guard";

function AppRouter() {
  return (
    <>
      <AuthRedirectGuard />

      <Switch>
        {/* Public and Customer Routes */}
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />

        {/* Seller Routes */}
        <Route path="/seller-dashboard" component={SellerDashboard} />
        <Route path="/seller-apply" component={SellerApplyPage} />
        <Route path="/seller-status" component={SellerStatusPage} />
         <Route path="/login" component={AuthPage} />
        {/* Delivery Routes */}
        <Route path="/delivery-dashboard" component={DeliveryDashboard} />
        <Route path="/delivery-apply" component={DeliveryApplyPage} />

        {/* Admin Route */}
        <Route path="/admin-dashboard" component={AdminDashboard} />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AuthRedirectGuard /> 
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
