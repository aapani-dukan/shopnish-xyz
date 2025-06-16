import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
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
import AdminDashboard from "@/pages/admin-dashboard"; // ✅ ADDED

// Loader UI
function Loader() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div
        className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        aria-label="Loading"
      />
    </div>
  );
}

// Routes requiring Firebase login (customer routes)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <Loader />;
  if (!firebaseUser) return <Redirect to="/auth" />;
  return <>{children}</>;
}

// Routes requiring approved seller status
function SellerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user?.isApprovedSeller) return <Redirect to="/seller-apply" />;
  return <>{children}</>;
}

// AppRouter with all logic
function AppRouter() {
  const { firebaseUser, loading: authLoading, user } = useAuth();
  const { isSeller, seller, isLoading: sellerLoading } = useSeller();
  const [location, setLocation] = useLocation();
  const currentPath = location;

  const isLoading = authLoading || sellerLoading;

  useEffect(() => {
    console.log("--- AppRouter State ---");
    console.log("firebaseUser:", firebaseUser);
    console.log("isSeller:", isSeller);
    console.log("seller:", seller);
    console.log("path:", currentPath);
  }, [isLoading, firebaseUser, isSeller, seller, currentPath]);

  if (isLoading) return <Loader />;

  // Not logged in
  if (!firebaseUser) {
    if (currentPath !== "/" && currentPath !== "/auth") {
      setLocation("/");
      return null;
    }
    return (
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Seller-specific routing
  if (isSeller) {
    if (seller?.approvalStatus === "approved") {
      if (
        currentPath === "/seller-apply" ||
        currentPath === "/seller-status"
      ) {
        setLocation("/seller-dashboard");
        return null;
      }
    } else if (
      seller?.approvalStatus === "pending" ||
      seller?.approvalStatus === "rejected"
    ) {
      if (currentPath !== "/seller-status") {
        setLocation("/seller-status");
        return null;
      }
    }
  } else {
    if (currentPath === "/seller-dashboard") {
      setLocation("/seller-apply");
      return null;
    }
  }

  return (
    <Switch>
      {/* Customer routes */}
      <Route path="/">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/product/:id">
        <ProtectedRoute>
          <ProductDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/cart">
        <ProtectedRoute>
          <Cart />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout">
        <ProtectedRoute>
          <Checkout />
        </ProtectedRoute>
      </Route>

      {/* Seller routes */}
      <Route path="/seller-dashboard">
        <ProtectedRoute>
          <SellerProtectedRoute>
            <SellerDashboard />
          </SellerProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/seller-apply">
        <ProtectedRoute>
          <SellerApplyPage />
        </ProtectedRoute>
      </Route>
      <Route path="/seller-status">
        <ProtectedRoute>
          <SellerStatusPage />
        </ProtectedRoute>
      </Route>

      {/* Admin Route (optional, for future use) */}
      <Route path="/admin-dashboard">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Root App Component
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
