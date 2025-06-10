// client/src/App.tsx

import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// SellerRegistrationForm को named import के रूप में इम्पोर्ट करें
// अगर यह export function SellerRegistrationForm है तो ऐसे इम्पोर्ट करें
// import { SellerRegistrationForm } from "@/components/seller/SellerRegistrationForm";

// RegisterSellerPage को default import के रूप में इम्पोर्ट करें
import RegisterSellerPage from "@/pages/register-seller";

import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";

// ध्यान दें: अगर ये कॉम्पोनेंट्स named export हैं तो { } का उपयोग करें
import SellerRequests from "./components/admin/SellerRequests";
import SellerDashboard from "@/pages/seller-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryDashboard from "@/pages/delivery-dashboard";

import { useAuth } from "@/hooks/useAuth"; // सुनिश्चित करें कि यह हुक सही काम कर रहा है

function RoleBasedRedirector() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    // अगर यूजर लॉग इन नहीं है और current path `/login` नहीं है, तो उसे `/login` पर भेजें
    if (!user && window.location.pathname !== "/login") {
      console.log("User not logged in, redirecting to /login from:", window.location.pathname);
      navigate("/login");
      return;
    }

    // अगर यूजर लॉग इन है
    if (user) {
      switch (user.role) {
        case "approved-seller":
          if (window.location.pathname !== "/seller-dashboard") {
            console.log("User is approved-seller, redirecting to /seller-dashboard.");
            navigate("/seller-dashboard");
          }
          break;
        case "seller": // यह रोल तब आ सकता है जब सेलर ने रजिस्टर कर दिया हो लेकिन अभी अप्रूव न हुआ हो
          if (window.location.pathname !== "/register-seller" && window.location.pathname !== "/seller-status" && window.location.pathname !== "/seller-dashboard") {
            console.log("User is 'seller' (pending), redirecting to /seller-status.");
            navigate("/seller-status");
          }
          break;
        case "admin":
          if (window.location.pathname !== "/admin-dashboard") {
            console.log("User is admin, redirecting to /admin-dashboard.");
            navigate("/admin-dashboard");
          }
          break;
        case "delivery":
          if (window.location.pathname !== "/delivery-dashboard") {
            console.log("User is delivery, redirecting to /delivery-dashboard.");
            navigate("/delivery-dashboard");
          }
          break;
        default:
          // अगर यूजर का कोई खास रोल नहीं है (freshly logged in with default role)
          // और वह `/login` या `/` (home) पर नहीं है, तो उसे `/` पर भेजें।
          // `login.tsx` अब `loginRole` के आधार पर पहले ही रीडायरेक्ट कर चुका होगा।
          if (window.location.pathname !== "/" && window.location.pathname !== "/login" && window.location.pathname !== "/register-seller") {
            console.log("User has no specific role, redirecting to / (Home).");
            navigate("/");
          }
          break;
      }
    }
  }, [user, loading, navigate]);

  return null;
}

function Router() {
  const [, setLocation] = useLocation(); // `useLocation` hook को यहां भी इनिशियलाइज़ करें

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />

      {/* Seller Registration Page */}
      <Route path="/register-seller" component={RegisterSellerPage} />

      {/* Role-Based Redirect: यह '/dashboard' पर आने पर चलेगा */}
      <Route path="/dashboard" component={RoleBasedRedirector} />

      {/* Seller pages */}
      <Route path="/SellerRequests" component={SellerRequests} />

      {/* Dashboards */}
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-dashboard" component={DeliveryDashboard} />

      {/* Seller Application Status Page (रजिस्ट्रेशन के बाद) */}
      <Route path="/seller-status" component={() => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Seller Application Pending</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your application! Your seller account is pending approval.
            We will notify you once it's reviewed.
          </p>
          <Button onClick={() => setLocation("/")}>Go to Home</Button> {/* wouter setLocation का उपयोग करें */}
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
               
