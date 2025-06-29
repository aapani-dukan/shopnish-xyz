// Client/src/App.tsx
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import "./index.css";

// ✅ Firebase Auth से संबंधित इम्पोर्ट्स
import { useEffect } from 'react'; // useEffect को इम्पोर्ट करें
import { handleRedirectResult, googleProvider } from './lib/firebase'; // handleRedirectResult और GoogleAuthProvider को इम्पोर्ट करें
// import { useLocation } from "wouter"; // Wouter के लिए useLocation हुक, यदि आप नेविगेट करना चाहते हैं

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
import LoginPage from "@/pages/login";
// ✅ Centralized auth-based routing
import { AuthRedirectGuard } from "@/components/auth-redirect-guard";
import AdminLogin from "@/pages/admin-login";

function AppRouter() {
  return (
    <>
      <Switch>
        {/* Public and Customer Routes */}
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />

        {/* Seller Routes */}
        <Route path="/seller-dashboard" component={SellerDashboard} />
        <Route path="/seller-apply" component={SellerApplyPage} />
        <Route path="/seller-status" component={SellerStatusPage} />
        <Route path="/login" component={LoginPage} />
        
        {/* Delivery Routes */}
        <Route path="/delivery-dashboard" component={DeliveryDashboard} />
        <Route path="/delivery-apply" component={DeliveryApplyPage} />

        {/* Admin Route */}
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/admin-dashboard" component={AdminDashboard} />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  // const [location, navigate] = useLocation(); // Wouter के लिए useNavigate()
  
  useEffect(() => {
    // यह फ़ंक्शन ऐप के लोड होते ही चलेगा
    handleRedirectResult()
      .then(async (result) => {
        if (result) {
          // ✅ उपयोगकर्ता अभी-अभी Google से रीडायरेक्ट होकर लौटा है और लॉगिन सफल रहा है
          const user = result.user;
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const idToken = credential?.idToken; // यह Firebase ID टोकन है

          console.log("Firebase Redirect Login Successful!", user);
          console.log("ID Token:", idToken);

          // TODO: अब इस `idToken` को अपने **बैकएंड सर्वर** पर भेजें।
          // आपका बैकएंड इस टोकन को Firebase Admin SDK का उपयोग करके सत्यापित करेगा।
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              // आपको यहां role (customer/seller) भेजने की आवश्यकता हो सकती है,
              // यदि आपका `/api/auth/login` एंडपॉइंट इसकी अपेक्षा करता है।
              // उदाहरण: body: JSON.stringify({ firebaseIdToken: idToken, role: 'customer' })
              // चूंकि आप टोकन Authorization header में भेज रहे हैं, body खाली भी हो सकती है यदि आवश्यक न हो।
              body: JSON.stringify({}) // या { role: 'customer' } यदि आपके backend को इसकी आवश्यकता है
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Backend login failed');
            }

            const serverResponse = await response.json();
            console.log("Backend response:", serverResponse);
            // ✅ सर्वर से JWT टोकन मिला, इसे local storage में स्टोर करें
            localStorage.setItem('token', serverResponse.token); 
            // ✅ उपयोगकर्ता को डैशबोर्ड या किसी सुरक्षित पेज पर रीडायरेक्ट करें
            // navigate('/dashboard'); // Wouter के साथ
             window.location.href = '/'; // या किसी डिफ़ॉल्ट पेज पर
          } catch (backendError) {
            console.error("Backend Login Error after Firebase Redirect:", backendError);
            // उपयोगकर्ता को एरर दिखाएं
          }
        } else {
          // कोई लंबित रीडायरेक्ट परिणाम नहीं है, उपयोगकर्ता ने सामान्य रूप से पेज लोड किया है।
          console.log("No pending redirect result.");
        }
      })
      .catch((error) => {
        // ✅ रीडायरेक्ट प्रक्रिया के दौरान कोई एरर हुआ (जैसे "missing initial state")
        console.error("Firebase Redirect Login Error:", error);
        // उपयोगकर्ता को एरर मैसेज दिखाएं या उन्हें फिर से लॉगिन करने का विकल्प दें
        // आप यहां specific errors (जैसे `auth/cancelled-popup-request`) को हैंडल कर सकते हैं
      });
  }, []); // ✅ यह useEffect हुक केवल एक बार चलेगा जब कंपोनेंट माउंट होगा।

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          {/* AuthRedirectGuard को यहां रखें, AppRouter के बाहर */}
          <AuthRedirectGuard />
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
