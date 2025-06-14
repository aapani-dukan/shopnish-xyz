// client/src/App.tsx
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
import { useEffect } from "react";
import "./index.css";

// Pages/Components
import Landing from "@/pages/landing";
import Home from "@/pages/home";
//import Products from "@/pages/products";
import SellerDashboard from "@/pages/seller-dashboard";
import Checkout from "@/pages/checkout";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryLogin from "@/pages/delivery-login";
import DeliveryDashboard from "@/pages/delivery-dashboard";
import NotFound from "@/pages/not-found";
import ProtectedSellerRoute from "@/components/ProtectedSellerRoute";
import RegisterSellerPage from "@/pages/register-seller";
import SellerStatusPage from "@/pages/seller-status";

function AppRouter() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isSeller, seller, isLoading: isSellerLoading } = useSeller();
  const [location, setLocation] = useLocation();

  const currentPath = location;
  const isLoading = isAuthLoading || isSellerLoading;

  useEffect(() => {
    console.log("--- AppRouter State ---");
    console.log("isAuthenticated:", isAuthenticated);
    console.log("isSeller:", isSeller);
    console.log("approvalStatus:", seller?.approvalStatus);
    console.log("currentPath:", currentPath);
    console.log("------------------------");
  }, [isAuthenticated, isSeller, seller, currentPath]);

  // ✅ Loading हो तो कुछ भी redirect मत करो
  if (isLoading) return null;

  // ✅ Authenticated नहीं है
  if (!isAuthenticated) {
    if (currentPath !== "/" && currentPath !== "/login") {
      setLocation("/");
      return null;
    }
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // ✅ Seller Redirects
  if (isSeller) {
    if (seller?.approvalStatus === "approved") {
      if (currentPath === "/register-seller" || currentPath === "/seller-status") {
        setLocation("/seller-dashboard");
        return null;
      }
    } else if (seller?.approvalStatus === "pending" || seller?.approvalStatus === "rejected") {
      if (currentPath !== "/seller-status" && currentPath !== "/register-seller") {
        setLocation("/seller-status");
        return null;
      }
    }
  } else {
    if (currentPath === "/seller-dashboard" || currentPath === "/seller") {
      setLocation("/register-seller");
      return null;
    }
  }

  // ✅ All Main Routes
  return (
    <Switch>
      <Route path="/" component={Home} />
   //   <Route path="/products" component={Products} />
   //   <Route path="/products/:category" component={Products} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/register-seller" component={RegisterSellerPage} />
      <Route path="/seller-status" component={SellerStatusPage} />
      <Route path="/seller">
        <ProtectedSellerRoute>
          <SellerDashboard />
        </ProtectedSellerRoute>
      </Route>
      <Route path="/seller-dashboard">
        <ProtectedSellerRoute>
          <SellerDashboard />
        </ProtectedSellerRoute>
      </Route>
      <Route path="/admin-access" component={AdminLogin} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-login" component={DeliveryLogin} />
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
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
