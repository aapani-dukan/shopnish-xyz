// client/src/App.tsx

import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// यहाँ आपके कॉम्पोनेंट्स के इम्पोर्ट्स हैं।
// सुनिश्चित करें कि आपके कॉम्पोनेंट्स सही तरीके से एक्सपोर्ट किए गए हैं (default या named).
// अगर SellerRegistrationForm named export है:
// import { SellerRegistrationForm } from "@/components/seller/SellerRegistrationForm"; 
// अगर RegisterSellerPage default export है:
import RegisterSellerPage from "@/pages/register-seller";

import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";

// ये कॉम्पोनेंट्स named export हो सकते हैं या default, आपके प्रोजेक्ट सेटअप पर निर्भर करता है।
// उदाहरण के लिए, अगर SellerRequests एक default export है, तो 'import SellerRequests from "./components/admin/SellerRequests";'
// अगर यह एक named export है, तो 'import { SellerRequests } from "./components/admin/SellerRequests";'
// मैंने यहाँ मान लिया है कि ये default exports हैं, जैसा कि आमतौर पर होता है।
import SellerRequests from "./components/admin/SellerRequests"; 
import SellerDashboard from "@/pages/seller-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import DeliveryDashboard from "@/pages/delivery-dashboard";

import { useAuth } from "@/hooks/useAuth"; // सुनिश्चित करें कि यह हुक सही काम कर रहा है और export किया गया है

function RoleBasedRedirector() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    const loginRole = sessionStorage.getItem("loginRole"); // sessionStorage से फ़्लैग पढ़ें
    const currentPath = window.location.pathname;

    // केस 1: यूजर लॉग इन नहीं है
    if (!user) {
      // अगर यूजर सेलर रजिस्ट्रेशन के लिए आया था (loginRole 'seller' है) और `/login` पर नहीं है,
      // तो उसे `/login` पर भेजें ताकि लॉगिन फ़्लो सही से पूरा हो सके.
      if (loginRole === "seller" && currentPath !== "/login") {
         console.log("Not logged in, 'seller' flow, redirecting to /login from:", currentPath);
         navigate("/login");
      } else if (currentPath !== "/login") {
         // सामान्य स्थिति: यूजर लॉग इन नहीं है और किसी विशेष फ़्लो में नहीं है, `/login` पर भेजें.
         console.log("Not logged in, redirecting to /login from:", currentPath);
         navigate("/login");
      }
      return; // रीडायरेक्ट के बाद फ़ंक्शन से बाहर निकलें
    }

    // केस 2: यूजर लॉग इन है लेकिन उसका रोल अभी तक निर्धारित नहीं हुआ है (initial state)
    if (user.role === null || user.role === undefined) { 
        if (loginRole === "seller" && currentPath !== "/register-seller") {
            // अगर loginRole 'seller' है, और हम `/register-seller` पर नहीं हैं,
            // तो उसे वहाँ भेजें (यह सुनिश्चित करता है कि वे रजिस्ट्रेशन पूरा करें).
            console.log("User logged in with default/null role, 'seller' flow, redirecting to /register-seller from:", currentPath);
            navigate("/register-seller");
            sessionStorage.removeItem("loginRole"); // उपयोग के बाद फ़्लैग हटा दें
            return;
        }
    }

    // केस 3: यूजर लॉग इन है और user.role सेट है
    switch (user.role) {
      case "approved-seller":
        if (currentPath !== "/seller-dashboard") {
          console.log("User is approved-seller, redirecting to /seller-dashboard.");
          navigate("/seller-dashboard");
        }
        break;
      case "not-approved-seller": // यह रोल तब आता है जब सेलर ने रजिस्टर कर दिया हो लेकिन अभी अप्रूव न हुआ हो
        if (currentPath !== "/seller-status" && currentPath !== "/seller-dashboard" && currentPath !== "/register-seller") {
          console.log("User is not-approved-seller, redirecting to /seller-status.");
          navigate("/seller-status"); // यूजर को बताएं कि उनका आवेदन लंबित है
        }
        break;
      case "admin":
        if (currentPath !== "/admin-dashboard") {
          console.log("User is admin, redirecting to /admin-dashboard.");
          navigate("/admin-dashboard");
        }
        break;
      case "delivery":
        if (currentPath !== "/delivery-dashboard") {
          console.log("User is delivery, redirecting to /delivery-dashboard.");
          navigate("/delivery-dashboard");
        }
        break;
      default:
        // अगर कोई विशेष रोल नहीं है (और loginRole 'seller' भी नहीं है),
        // तो होम पेज पर रीडायरेक्ट करें, बशर्ते वे पहले से होम पर न हों या लॉगिन/रजिस्ट्रेशन पर न हों.
        if (currentPath !== "/" && currentPath !== "/login" && currentPath !== "/register-seller") {
          console.log("User has no specific role, redirecting to / (Home).");
          navigate("/");
        }
        break;
    }
  }, [user, loading, navigate]); // `loginRole` को dependency में जोड़ने की ज़रूरत नहीं क्योंकि हम इसे सीधे `sessionStorage` से पढ़ रहे हैं

  return null;
}

function Router() {
  const [, setLocation] = useLocation(); // `useLocation` hook को यहाँ भी इनिशियलाइज़ करें, ताकि `setLocation` का उपयोग `seller-status` कॉम्पोनेंट में किया जा सके.

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />

      {/* Seller Registration Page */}
      <Route path="/register-seller" component={RegisterSellerPage} />

      {/* Role-Based Redirect: यह `/dashboard` पर आने पर चलेगा */}
      <Route path="/dashboard" component={RoleBasedRedirector} />

      {/* Seller pages (अगर ये अलग से राउट किए गए हैं) */}
      <Route path="/SellerRequests" component={SellerRequests} />

      {/* Dashboards */}
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/delivery-dashboard" component={DeliveryDashboard} />

      {/* Seller Application Status Page (रजिस्ट्रेशन के बाद दिखाया जाएगा) */}
      <Route path="/seller-status" component={() => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Seller Application Pending</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your application! Your seller account is pending approval.
            We will notify you once it's reviewed.
          </p>
          <Button onClick={() => setLocation("/")}>Go to Home</Button> {/* `setLocation` का उपयोग करें */}
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

export default App; // App कॉम्पोनेंट को default export करें
           
