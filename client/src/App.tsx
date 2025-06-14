// client/src/App.tsx
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
import { useEffect } from "react";
import "./index.css";

/* ===== Pages ===== */
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import RegisterSellerPage from "@/pages/register-seller";
import SellerStatusPage   from "@/pages/seller-status";
import SellerDashboard    from "@/pages/seller-dashboard";
import NotFound           from "@/pages/not-found";
import ProtectedSellerRoute from "@/components/ProtectedSellerRoute";
/* ================== */

function AppRouter() {
  /* -------- auth & seller state -------- */
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isSeller, seller, isLoading: isSellerLoading } = useSeller();

  /* -------- router helpers -------- */
  const [location, setLocation] = useLocation();
  const currentPath = location;

  /* -------- global loading -------- */
  const isLoading = isAuthLoading || isSellerLoading;

  /* ---------- debug log ----------- */
  useEffect(() => {
    console.log("--- App State ---");
    console.log("isAuthenticated:", isAuthenticated);
    console.log("isSeller:",        isSeller);
    console.log("approvalStatus:",  seller?.approvalStatus);
    console.log("currentPath:",     currentPath);
    console.log("------------------");
  }, [isAuthenticated, isSeller, seller, currentPath]);

  /* -------- show spinner while loading -------- */
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  /* -------- unauthenticated user -------- */
  if (!isAuthenticated) {
    if (currentPath !== "/" && currentPath !== "/login") {
      setLocation("/");           // force to Landing
      return null;
    }
    return (
      <Switch>
        <Route path="/"       component={Landing} />
        <Route path="/login"  component={Landing} />
        <Route               component={NotFound} />
      </Switch>
    );
  }

  /* -------- authenticated user -------- */
  if (isSeller) {
    /* ✅ seller exists */
    if (seller?.approvalStatus === "approved") {
      /* approved seller → dashboard */
      if (currentPath !== "/seller-dashboard") {
        setLocation("/seller-dashboard");
        return null;
      }
    } else {
      /* pending / rejected → status page */
      if (currentPath !== "/seller-status") {
        setLocation("/seller-status");
        return null;
      }
    }
  } else {
    /* ✅ authenticated but NOT a seller */
    if (currentPath !== "/register-seller") {
      setLocation("/register-seller");
      return null;
    }
  }

  /* -------- normal routes (no redirect) -------- */
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* seller routes */}
      <Route path="/register-seller" component={RegisterSellerPage} />
      <Route path="/seller-status"   component={SellerStatusPage} />

      <Route path="/seller-dashboard">
        <ProtectedSellerRoute>
          <SellerDashboard />
        </ProtectedSellerRoute>
      </Route>

      {/* fallback */}
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
