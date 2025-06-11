// client/src/App.tsx (संशोधित)

import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react"; // useEffect यहाँ भी है, लेकिन RoleBasedRedirector के लिए नहीं
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// AuthRedirectGuard को इम्पोर्ट करें
import AuthRedirectGuard from "@/components/auth-redirect-guard"; // ✅ नया इम्पोर्ट

import RegisterSellerPage from "@/pages/register-seller";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import SellerRequests from "./components/admin/SellerRequests"; 
import SellerDashboard from "@/pages/seller-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryDashboard from "@/pages/delivery-dashboard";

// useAuth को यहाँ इम्पोर्ट करने की आवश्यकता नहीं है क्योंकि यह केवल AuthRedirectGuard में उपयोग होता है
// import { useAuth } from "@/hooks/useAuth";

// RoleBasedRedirector फंक्शन को हटा दें
// function RoleBasedRedirector() { ... }

function Router() {
  const [, setLocation] = useLocation(); 

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />

      {/* Seller Registration Page */}
      <Route path="/register-seller" component={RegisterSellerPage} />

      {/* Dashboard राउट्स को सीधे कॉम्पोनेंट्स पर पॉइंट करें */}
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-dashboard" component={DeliveryDashboard} />

      {/* Seller specific pages */}
      <Route path="/SellerRequests" component={SellerRequests} />

      {/* Seller Application Status Page */}
      <Route path="/seller-status" component={() => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Seller Application Pending</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your application! Your seller account is pending approval.
            We will notify you once it's reviewed.
          </p>
          {/* यहाँ Button कॉम्पोनेंट को इम्पोर्ट करना होगा यदि यह पहले से नहीं है */}
          {/* import { Button } from "@/components/ui/button"; */}
          <Button onClick={() => setLocation("/")}>Go to Home</Button> 
        </div>
      )} />

      {/* 404 Not Found के लिए कैच-ऑल राउट */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* AuthRedirectGuard अब आपके Router के चारों ओर लपेटा जाएगा */}
        <AuthRedirectGuard> {/* ✅ AuthRedirectGuard का उपयोग करें */}
          <Router />
        </AuthRedirectGuard>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
