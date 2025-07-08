// Client/src/App.tsx

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
    <Switch>
      {/* Public and Customer Routes */}
      <Route path="/" component={HomePage} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />

      {/* ✅ फिक्स यहाँ है: AuthPage को सीधे रेंडर करें, AuthRedirectGuard के अंदर नहीं।
          AuthPage के अंदर ही ऑथेंटिकेशन स्टेट के आधार पर रीडायरेक्ट लॉजिक है।
      */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Seller Routes - PrivateRoute का उपयोग करें */}
      <PrivateRoute path="/seller-dashboard" component={SellerDashboard} redirectTo="/auth" />
      <PrivateRoute path="/seller-apply" component={SellerApplyPage} redirectTo="/auth" />
      <PrivateRoute path="/seller-status" component={SellerStatusPage} redirectTo="/auth" />
      
      {/* Delivery Routes - PrivateRoute का उपयोग करें */}
      <PrivateRoute path="/delivery-dashboard" component={DeliveryDashboard} redirectTo="/auth" />
      <PrivateRoute path="/delivery-apply" component={DeliveryApplyPage} redirectTo="/auth" />

      {/* Admin Route */}
      <Route path="/admin-login" component={AdminLogin} /> 
      <PrivateRoute path="/admin-dashboard" component={AdminDashboard} redirectTo="/admin-login" />

      {/* 404 - कोई भी अन्य पाथ */}
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
