// client/src/App.tsx
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth"; // useAuth को इम्पोर्ट करें
import { useSeller } from "@/hooks/useSeller"; // useSeller को इम्पोर्ट करें

// Pages/Components
import Landing from "@/pages/landing"; // आपका लॉगिन पेज
import Home from "@/pages/home";
import Products from "@/pages/products";
import SellerDashboard from "@/pages/seller-dashboard";
import Checkout from "@/pages/checkout";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryLogin from "@/pages/delivery-login";
import DeliveryDashboard from "@/pages/delivery-dashboard";
import NotFound from "@/pages/not-found";
import ProtectedSellerRoute from "@/components/ProtectedSellerRoute"; // इसे रहने दें

// ✅ New: RegisterSellerPage को इम्पोर्ट करें (यह अब एक पेज होगा)
import RegisterSellerPage from "@/pages/register-seller"; 
import SellerStatusPage from "@/pages/seller-status"; // यदि आपके पास यह पेज है

function AppRouter() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { isSeller, seller, isLoading: isSellerLoading } = useSeller(); // useSeller से डेटा प्राप्त करें
  const [, setLocation] = useLocation();

  const currentPath = window.location.pathname;

  // समग्र लोडिंग स्थिति
  const isLoading = isAuthLoading || isSellerLoading;

  // यदि अभी भी डेटा लोड हो रहा है, तो लोडर दिखाएं
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // --- ऑथेंटिकेशन और रीडायरेक्ट लॉजिक ---
  // 1. यदि प्रमाणित नहीं है
  if (!isAuthenticated) {
    // यदि वर्तमान पथ `/` या `/login` है, तो Landing पेज दिखाएं
    if (currentPath === '/' || currentPath === '/login') {
      return (
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Landing} /> 
          <Route component={NotFound} /> // अन्य सभी रूट्स के लिए 404
        </Switch>
      );
    } else {
      // यदि प्रमाणित नहीं है और किसी अन्य संरक्षित रूट पर है, तो Landing पेज पर रीडायरेक्ट करें
      console.log("AppRouter: Not authenticated, redirecting to /.");
      setLocation("/");
      return null; // रीडायरेक्ट होने तक कुछ भी रेंडर न करें
    }
  }

  // 2. यदि प्रमाणित है (isAuthenticated = true)
  // अब उपयोगकर्ता की भूमिका और सेलर स्थिति के आधार पर रीडायरेक्ट करें

  // सेलर रजिस्ट्रेशन फ़्लो को हैंडल करें
  // यदि उपयोगकर्ता लॉग इन है, लेकिन विक्रेता नहीं है, और /register-seller पर नहीं है
  // तो उसे /register-seller पर रीडायरेक्ट करें (यदि वह "Become a Seller" फ़्लो से आया है)
  // हम अब sessionStorage.loginRole का उपयोग नहीं कर रहे हैं, बल्कि SellerRegistrationModal में `isPageMode` का उपयोग कर रहे हैं।
  // `ProtectedSellerRoute` ही इस रीडायरेक्ट को हैंडल करेगा।

  if (isSeller) {
    // यदि विक्रेता पंजीकृत है
    if (seller?.approvalStatus === "approved") {
      // यदि अनुमोदित है और /seller-dashboard पर नहीं है, तो वहां रीडायरेक्ट करें
      if (currentPath === "/register-seller" || currentPath === "/seller-status") {
        console.log("AppRouter: User is approved seller, redirecting to /seller-dashboard.");
        setLocation("/seller-dashboard");
        return null;
      }
    } else if (seller?.approvalStatus === "pending" || seller?.approvalStatus === "rejected") {
      // यदि लंबित/अस्वीकृत है और /seller-status पर नहीं है, तो वहां रीडायरेक्ट करें
      if (currentPath !== "/seller-status" && currentPath !== "/register-seller" ) { // register-seller पर न भेजें
        console.log("AppRouter: User is pending/rejected seller, redirecting to /seller-status.");
        setLocation("/seller-status");
        return null;
      }
    }
  } else if (currentPath === "/seller-dashboard" || currentPath === "/seller") {
    // यदि कोई विक्रेता नहीं है और /seller-dashboard या /seller पर जाने की कोशिश कर रहा है, तो उसे /register-seller पर भेजें
    console.log("AppRouter: User is not a seller, redirecting to /register-seller.");
    setLocation("/register-seller");
    return null;
  }
  
  // --- मुख्य रूट्स ---
  return (
    <Switch>
      {/* मुख्य रूट्स (सभी प्रमाणित उपयोगकर्ताओं के लिए) */}
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:category" component={Products} />
      <Route path="/checkout" component={Checkout} />

      {/* सेलर रूट्स */}
      <Route path="/register-seller" component={RegisterSellerPage} /> {/* यह पेज हमेशा उपलब्ध होगा यदि उपयोगकर्ता लॉग इन है लेकिन विक्रेता नहीं */}
      <Route path="/seller-status" component={SellerStatusPage} /> {/* सेलर स्थिति पेज */}
      <Route path="/seller">
        <ProtectedSellerRoute>
          <SellerDashboard />
        </ProtectedSellerRoute>
      </Route>
      <Route path="/seller-dashboard">
        <ProtectedSellerRoute>
          <SellerDashboard />
        </ProtectedSellerRoute>
      </Route>

      {/* Admin और Delivery रूट्स */}
      <Route path="/admin-access" component={AdminLogin} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-login" component={DeliveryLogin} />
      <Route path="/delivery-dashboard" component={DeliveryDashboard} />
      
      {/* Catch-all for unknown routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
        
