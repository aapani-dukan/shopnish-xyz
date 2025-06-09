import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";
import RegisterSeller from "@/pages/register-seller";
import Login from "@/pages/login";

import SellerGate from "@/pages/seller";                    // seller.tsx renamed as SellerGate here
import SellerRequests from "@/pages/seller-requests";       // seller-requests.tsx for admin
import SellerDashboard from "@/pages/seller-dashboard";     // current seller dashboard (if needed separately)
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryDashboard from "@/pages/delivery-dashboard";

import { useAuth } from "@/hooks/useAuth";

function RoleBasedRedirector() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
    } else {
      switch (user.role) {
        case "seller":
          navigate("/seller");               // redirecting to SellerGate page (/seller)
          break;
        case "admin":
          navigate("/admin-dashboard");
          break;
        case "delivery":
          navigate("/delivery-dashboard");
          break;
        default:
          navigate("/");
      }
    }
  }, [user, loading, navigate]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />
      <Route path="/register-seller" component={RegisterSeller} />

      {/* Role-Based Redirect */}
      <Route path="/dashboard" component={RoleBasedRedirector} />

      {/* Seller pages */}
      <Route path="/seller" component={SellerGate} />
      <Route path="/seller-requests" component={SellerRequests} />

      {/* Dashboards */}
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-dashboard" component={DeliveryDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
