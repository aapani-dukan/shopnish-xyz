// client/src/App.tsx
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
import { useEffect } from "react"; // useEffect को इम्पोर्ट करें

// Pages/Components
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Products from "@/pages/products";
import SellerDashboard from "@/pages/seller-dashboard";
import Checkout from "@/pages/checkout";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryLogin from "@/pages/delivery-login";
import DeliveryDashboard from "@/pages/delivery-dashboard";
import NotFound from "@/pages/not-found";
import ProtectedSellerRoute from "@/components/ProtectedSellerRoute";
import RegisterSellerPage from "@/pages/register-seller";
import SellerStatusPage from "@/pages/seller-status";

function AppRouter() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { isSeller, seller, isLoading: isSellerLoading } = useSeller();
  const [location, setLocation] = useLocation(); // location को भी प्राप्त करें

  const currentPath = location; // wouter में location सीधे path देता है

  // समग्र लोडिंग स्थिति
  const isLoading = isAuthLoading || isSellerLoading;

  // कंसोल लॉग्स जोड़ें (डीबगिंग के लिए)
  useEffect(() => {
    console.log("--- AppRouter State Update ---");
    console.log("  isLoading:", isLoading);
    console.log("  isAuthenticated:", isAuthenticated);
    console.log("  isSeller:", isSeller);
    console.log("  seller status:", seller?.approvalStatus);
    console.log("  currentPath:", currentPath);
    console.log("----------------------------");
  }, [isLoading, isAuthenticated, isSeller, seller, currentPath]);

  // यदि अभी भी डेटा लोड हो रहा है, तो लोडर दिखाएं
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // --- ऑथेंटिकेशन और रीडायरेक्ट लॉजिक ---
  // यदि उपयोगकर्ता प्रमाणित नहीं है
  if (!isAuthenticated) {
    // केवल '/' और '/login' को अनुमति दें जब प्रमाणित न हो
    if (currentPath !== '/' && currentPath !== '/login') {
      console.log("AppRouter: Not authenticated, redirecting to /.");
      setLocation("/");
      return null;
    }
    // '/' या '/login' पर हैं, तो Landing पेज रेंडर करें
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Landing} />
        <Route component={NotFound} /> {/* अन्य सभी रूट्स के लिए 404 */}
      </Switch>
    );
  }

  // यदि उपयोगकर्ता प्रमाणित है (isAuthenticated = true)
  // अब उपयोगकर्ता की भूमिका और सेलर स्थिति के आधार पर रीडायरेक्ट करें

  // सेलर-विशिष्ट रीडायरेक्ट
  if (isSeller) {
    if (seller?.approvalStatus === "approved") {
      // यदि अनुमोदित है और /seller-dashboard या /seller पर नहीं है, तो वहां रीडायरेक्ट करें
      // और register-seller या seller-status से दूर ले जाएं
      if (currentPath === "/register-seller" || currentPath === "/seller-status") {
        console.log("AppRouter: User is approved seller, redirecting to /seller-dashboard.");
        setLocation("/seller-dashboard");
        return null;
      }
    } else if (seller?.approvalStatus === "pending" || seller?.approvalStatus === "rejected") {
      // यदि लंबित/अस्वीकृत है और /seller-status पर नहीं है, तो वहां रीडायरेक्ट करें
      // और register-seller पर न भेजें
      if (currentPath !== "/seller-status" && currentPath !== "/register-seller") {
        console.log("AppRouter: User is pending/rejected seller, redirecting to /seller-status.");
        setLocation("/seller-status");
        return null;
      }
    }
  } else { // यदि isSeller === false (अर्थात, उपयोगकर्ता प्रमाणित है लेकिन विक्रेता नहीं है)
    if (currentPath === "/seller-dashboard" || currentPath === "/seller") {
      // यदि कोई विक्रेता नहीं है और /seller-dashboard या /seller पर जाने की कोशिश कर रहा है, तो उसे /register-seller पर भेजें
      console.log("AppRouter: User is not a seller, redirecting to /register-seller.");
      setLocation("/register-seller");
      return null;
    }
  }

  // --- मुख्य रूट्स ---
  // यहां पहुंचें यदि कोई रीडायरेक्ट नहीं हुआ है
  return (
    <Switch>
      {/* मुख्य रूट्स (सभी प्रमाणित उपयोगकर्ताओं के लिए) */}
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:category" component={Products} />
      <Route path="/checkout" component={Checkout} />

      {/* सेलर रूट्स */}
      {/* register-seller: हमेशा उपलब्ध ताकि कोई भी प्रमाणित उपयोगकर्ता सेलर के लिए आवेदन कर सके */}
      <Route path="/register-seller" component={RegisterSellerPage} />
      {/* seller-status: हमेशा उपलब्ध ताकि उपयोगकर्ता अपनी सेलर स्थिति देख सके */}
      <Route path="/seller-status" component={SellerStatusPage} />
      
      {/* सेलर डैशबोर्ड केवल ProtectedSellerRoute के माध्यम से एक्सेस किया जा सकता है */}
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
