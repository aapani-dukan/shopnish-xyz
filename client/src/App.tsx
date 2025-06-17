import { useEffect } from "react"; import { Switch, Route, Redirect, useLocation } from "wouter"; import { QueryClientProvider } from "@tanstack/react-query"; import { queryClient } from "./lib/queryClient"; import { TooltipProvider } from "@/components/ui/tooltip"; import { Toaster } from "@/components/ui/toaster"; import { AuthProvider, useAuth } from "@/hooks/useAuth"; import { useSeller } from "@/hooks/useSeller"; import { useDelivery } from "@/hooks/useDelivery";

// Pages import HomePage from "@/pages/home"; import ProductDetail from "@/pages/product-detail"; import Cart from "@/pages/cart"; import Checkout from "@/pages/checkout"; import AuthPage from "@/pages/auth"; import SellerDashboard from "@/pages/seller-dashboard"; import SellerApplyPage from "@/pages/seller-apply"; import SellerStatusPage from "@/pages/seller-status"; import AdminDashboard from "@/pages/admin-dashboard"; import DeliveryDashboard from "@/pages/delivery-dashboard"; import DeliveryApplyPage from "@/pages/delivery-apply"; import NotFound from "@/pages/not-found";

function Loader() { return ( <div className="h-screen flex items-center justify-center"> <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /> </div> ); }

function ProtectedRoute({ children }: { children: React.ReactNode }) { const { firebaseUser, loading } = useAuth(); if (loading) return <Loader />; if (!firebaseUser) return <Redirect to="/auth" />; return <>{children}</>; }

function SellerProtectedRoute({ children }: { children: React.ReactNode }) { const { user, loading } = useAuth(); if (loading) return <Loader />; if (!user?.isApprovedSeller) return <Redirect to="/seller-apply" />; return <>{children}</>; }

function DeliveryProtectedRoute({ children }: { children: React.ReactNode }) { const { user, loading } = useAuth(); if (loading) return <Loader />; if (!user?.isApprovedDeliveryBoy) return <Redirect to="/delivery-apply" />; return <>{children}</>; }

function AppRouter() { const { firebaseUser, loading: authLoading, user } = useAuth(); const { isSeller, seller, isLoading: sellerLoading } = useSeller(); const { isDelivery, delivery, isLoading: deliveryLoading } = useDelivery(); const [location, setLocation] = useLocation();

const currentPath = location; const isLoading = authLoading || sellerLoading || deliveryLoading;

useEffect(() => { console.log("--- AppRouter State ---"); console.log("firebaseUser:", firebaseUser); console.log("user:", user); console.log("path:", currentPath); }, [isLoading, firebaseUser, user, currentPath]);

if (isLoading) return <Loader />;

// Not logged in if (!firebaseUser) { if (currentPath !== "/" && currentPath !== "/auth") { setLocation("/"); return null; } return ( <Switch> <Route path="/" component={AuthPage} /> <Route path="/auth" component={AuthPage} /> <Route component={NotFound} /> </Switch> ); }

// Seller flow if (isSeller) { if (seller?.approvalStatus === "approved") { if ( currentPath === "/seller-apply" || currentPath === "/seller-status" ) { setLocation("/seller-dashboard"); return null; } } else { if (currentPath !== "/seller-status") { setLocation("/seller-status"); return null; } } } else { if (currentPath === "/seller-dashboard") { setLocation("/seller-apply"); return null; } }

// Delivery flow if (isDelivery) { if (delivery?.approvalStatus === "approved") { if (currentPath === "/delivery-apply") { setLocation("/delivery-dashboard"); return null; } } else { if (currentPath !== "/delivery-apply") { setLocation("/delivery-apply"); return null; } } } else { if (currentPath === "/delivery-dashboard") { setLocation("/delivery-apply"); return null; } }

return ( <Switch> <Route path="/"> <ProtectedRoute> <HomePage /> </ProtectedRoute> </Route>

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

  <Route path="/admin-dashboard">
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  </Route>

  <Route component={NotFound} />
</Switch>

); }

function App() { return ( <QueryClientProvider client={queryClient}> <TooltipProvider> <AuthProvider> <Toaster /> <AppRouter /> </AuthProvider> </TooltipProvider> </QueryClientProvider> ); }

export default App;

