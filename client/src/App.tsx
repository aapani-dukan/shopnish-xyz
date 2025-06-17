import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
import { useDeliveryBoy } from "@/hooks/useDeliveryBoy";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <Loader />;
  if (!firebaseUser) return <Redirect to="/auth" />;
  return <>{children}</>;
}

function SellerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user?.isApprovedSeller) return <Redirect to="/seller-apply" />;
  return <>{children}</>;
}

function DeliveryProtectedRoute({ children }: { children: React.ReactNode }) {
  const { deliveryUser, loading } = useDeliveryBoy();
  if (loading) return <Loader />;
  if (!deliveryUser?.isApproved) return <Redirect to="/delivery-apply" />;
  return <>{children}</>;
}

function AppRouter() {
  const { firebaseUser, loading: authLoading, user } = useAuth();
  const { isSeller, seller, isLoading: sellerLoading } = useSeller();
  const { isDeliveryBoy, deliveryUser, isLoading: deliveryLoading } = useDeliveryBoy();
  const [location, setLocation] = useLocation();
  const currentPath = location;

  const isLoading = authLoading || sellerLoading || deliveryLoading;

  useEffect(() => {
    console.log("firebaseUser:", firebaseUser);
    console.log("isSeller:", isSeller);
    console.log("seller:", seller);
    console.log("isDeliveryBoy:", isDeliveryBoy);
    console.log("deliveryUser:", deliveryUser);
    console.log("path:", currentPath);
  }, [isLoading, firebaseUser, isSeller, seller, isDeliveryBoy, deliveryUser, currentPath]);

  if (isLoading) return <Loader />;

  // Not logged in: Only allow / and /auth
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

  // Seller route redirection
  if (isSeller) {
    if (seller?.approvalStatus === "approved") {
      if (currentPath === "/seller-apply" || currentPath === "/seller-status") {
        setLocation("/seller-dashboard");
        return null;
      }
    } else if (seller?.approvalStatus === "pending" || seller?.approvalStatus === "rejected") {
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

  // Delivery Boy route redirection
  if (isDeliveryBoy) {
    if (deliveryUser?.approvalStatus === "approved") {
      if (currentPath === "/delivery-apply") {
        setLocation("/delivery-dashboard");
        return null;
      }
    } else {
      if (currentPath !== "/delivery-apply") {
        setLocation("/delivery-apply");
        return null;
      }
    }
  } else {
    if (currentPath === "/delivery-dashboard") {
      setLocation("/delivery-apply");
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

      {/* Delivery routes */}
      <Route path="/delivery-dashboard">
        <ProtectedRoute>
          <DeliveryProtectedRoute>
            <DeliveryDashboard />
          </DeliveryProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/delivery-apply">
        <ProtectedRoute>
          <DeliveryApplyPage />
        </ProtectedRoute>
      </Route>

      {/* Admin route */}
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
