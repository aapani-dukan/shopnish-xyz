// Client/src/App.tsx

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth"; // AuthProvider को इम्पोर्ट करें
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
// ✅ LoginPage को हटा दिया है, AuthPage से ही लॉगिन/रजिस्टर हैंडल करेंगे।
// अगर आप इसे रखना चाहते हैं, तो सुनिश्चित करें कि यह AuthPage से ओवरलैप न करे।
// import LoginPage from "@/pages/login";

// ✅ Centralized auth-based routing
import { AuthRedirectGuard } from "@/components/auth-redirect-guard"; // इस गार्ड को यहाँ उपयोग करेंगे
import AdminLogin from "@/pages/admin-login";

// एक प्राइवेट राउट कंपोनेंट बनाएं जो AuthRedirectGuard का उपयोग करता है
// यह सुनिश्चित करेगा कि प्रोटेक्टेड रूट्स तक पहुँचने से पहले ऑथेंटिकेशन चेक हो।
// wouter के लिए, हम इसे एक HOC (Higher-Order Component) या एक रैपर कंपोनेंट के रूप में बना सकते हैं।
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
      {/* होम पेज हमेशा पब्लिक होना चाहिए */}
      <Route path="/" component={HomePage} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />

      {/* ✅ ऑथेंटिकेशन पेज:
          - अगर यूजर लॉग इन है, तो AuthPage को AuthRedirectGuard रीडायरेक्ट कर देगा।
          - अगर लॉग इन नहीं है, तो यहीं रहेगा।
          - यह सुनिश्चित करता है कि लॉग-इन होने पर /auth पर नहीं अटकेंगे।
      */}
      <Route path="/auth">
        <AuthRedirectGuard redirectTo="/seller-dashboard"> {/* या /dashboard */}
          <AuthPage />
        </AuthRedirectGuard>
      </Route>
      
      {/* Seller Routes - PrivateRoute का उपयोग करें */}
      <PrivateRoute path="/seller-dashboard" component={SellerDashboard} redirectTo="/auth" />
      <PrivateRoute path="/seller-apply" component={SellerApplyPage} redirectTo="/auth" />
      <PrivateRoute path="/seller-status" component={SellerStatusPage} redirectTo="/auth" />
      {/* ✅ LoginPage हटा दिया गया है, अगर चाहिए तो इसे AuthPage से अलग हैंडल करें */}
      {/* <PrivateRoute path="/login" component={LoginPage} redirectTo="/auth" /> */}
      
      {/* Delivery Routes - PrivateRoute का उपयोग करें */}
      <PrivateRoute path="/delivery-dashboard" component={DeliveryDashboard} redirectTo="/auth" />
      <PrivateRoute path="/delivery-apply" component={DeliveryApplyPage} redirectTo="/auth" />

      {/* Admin Route - PrivateRoute का उपयोग करें */}
      <Route path="/admin-login" component={AdminLogin} /> {/* AdminLogin शायद पब्लिक होना चाहिए */}
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
        <AuthProvider> {/* AuthProvider से AuthContext मिलता है */}
          <Toaster />
          {/* AuthRedirectGuard को यहाँ सीधे उपयोग करने के बजाय, 
              हम इसे PrivateRoute के अंदर या विशिष्ट रूट्स पर उपयोग कर रहे हैं।
              इसलिए, यहाँ से इसे हटा दिया गया है। */}
          {/* <AuthRedirectGuard /> */} 
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
