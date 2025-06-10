// client/src/App.tsx

import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// **यहां बदलाव किया गया है:** SellerRegistrationForm को named import के रूप में इम्पोर्ट करें
// (यह पहले से ही सही था, बस पुष्टि के लिए शामिल किया गया है)
import { SellerRegistrationForm } from "@/components/seller/SellerRegistrationForm";

// **यहां बदलाव किया गया है:** RegisterSellerPage को default import के रूप में इम्पोर्ट करें
import RegisterSellerPage from "@/pages/register-seller"; // ✅ अब यह सही है

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
          navigate("/seller-dashboard"); // seller को सीधे डैशबोर्ड पर भेजें
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

      {/* **यहां बदलाव किया गया है:** /register-seller राउट के लिए RegisterSellerPage का उपयोग करें */}
      <Route path="/register-seller" component={RegisterSellerPage} />

      {/* **यह लाइन हटाई गई है** - यह अनावश्यक राउट था */}
      {/* <Rout path="/SellerRegistrationForm" component={SellerRegistrationForm} /> */}

      {/* Role-Based Redirect */}
      <Route path="/dashboard" component={RoleBasedRedirector} />

      {/* Seller pages */}
      <Route path="/SellerRequests" component={SellerRequests} />

      {/* Dashboards */}
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-dashboard" component={DeliveryDashboard} />

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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
