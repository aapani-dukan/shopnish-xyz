import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
import { useEffect } from "react";
import "./index.css";

// Pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import RegisterSellerPage from "@/pages/register-seller";
import SellerStatusPage from "@/pages/seller-status";
import SellerDashboard from "@/pages/seller-dashboard";

function AppRouter() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    isInitialized, // ✅ जोड़ा गया
  } = useAuth();
  const {
    isSeller,
    seller,
    isLoading: isSellerLoading,
  } = useSeller();
  const [location, setLocation] = useLocation();
  const currentPath = location;

  const isLoading = isAuthLoading || isSellerLoading;

  useEffect(() => {
    console.log("--- Auth + Seller State ---");
    console.log("isAuthenticated:", isAuthenticated);
    console.log("isSeller:", isSeller);
    console.log("approvalStatus:", seller?.approvalStatus);
    console.log("currentPath:", currentPath);
  }, [isAuthenticated, isSeller, seller, currentPath]);

  // 🔒 Firebase init होने तक wait करें
  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ⏳ Auth या Seller की loading
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // 🚫 Not Authenticated
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

  // 🔁 Seller Redirection Logic
  if (isSeller) {
    if (seller?.approvalStatus === "approved") {
      if (currentPath === "/register-seller" || currentPath === "/seller-status") {
        setLocation("/seller-dashboard");
        return null;
      }
    } else {
      if (currentPath !== "/seller-status" && currentPath !== "/register-seller") {
        setLocation("/seller-status");
        return null;
      }
    }
  } else {
    if (currentPath === "/seller-dashboard") {
      setLocation("/register-seller");
      return null;
    }
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register-seller" component={RegisterSellerPage} />
      <Route path="/seller-status" component={SellerStatusPage} />
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}

export default App;
