import { Switch, Route, Redirect } from "wouter"; import { QueryClientProvider } from "@tanstack/react-query"; import { queryClient } from "./lib/queryClient"; import { TooltipProvider } from "@/components/ui/tooltip"; import { Toaster } from "@/components/ui/toaster"; import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Customer‑facing pages import HomePage from "@/pages/home"; import ProductDetail from "@/pages/product-detail"; import Cart from "@/pages/cart"; import Checkout from "@/pages/checkout";

// Seller / Auth pages import AuthPage from "@/pages/auth"; import SellerDashboard from "@/pages/seller-dashboard"; import SellerApplyPage from "@/pages/seller-apply";

// Fallback import NotFound from "@/pages/not-found";

/**

Gatekeep routes that require the Firebase user to be signed‑in (general customer login). */ function ProtectedRoute({ children }: { children: React.ReactNode }) { const { firebaseUser, loading } = useAuth();


if (loading) { return ( <div className="min-h-screen flex items-center justify-center"> <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div> </div> ); }

if (!firebaseUser) { return <Redirect to="/auth" />; }

return <>{children}</>; }

/**

Further gatekeep seller‑only routes to ensure the logged‑in user is an approved seller. */ function SellerProtectedRoute({ children }: { children: React.ReactNode }) { const { user, loading } = useAuth();


if (loading) { return ( <div className="min-h-screen flex items-center justify-center"> <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div> </div> ); }

if (!user?.isApprovedSeller) { return <Redirect to="/seller-apply" />; }

return <>{children}</>; }

/**

Consolidated application router combining customer and seller flows. */ function AppRouter() { const { firebaseUser, loading } = useAuth();


if (loading) { return ( <div className="min-h-screen flex items-center justify-center"> <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div> </div> ); }

return ( <Switch> {/* -------- Authentication -------- */} <Route path="/auth"> {firebaseUser ? <Redirect to="/" /> : <AuthPage />} </Route>

{/* -------- Customer‑facing routes -------- */}
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

  {/* -------- Seller routes -------- */}
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

  {/* -------- 404 -------- */}
  <Route component={NotFound} />
</Switch>

); }

/**

Root component: wires up providers & router. */ function App() { return ( <QueryClientProvider client={queryClient}> <TooltipProvider> <AuthProvider> <Toaster /> <AppRouter /> </AuthProvider> </TooltipProvider> </QueryClientProvide
                                                                                                                                                                                                                     r> ); }


export default App;
