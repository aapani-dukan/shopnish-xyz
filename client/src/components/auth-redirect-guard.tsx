// client/src/components/auth-redirect-guard.tsx

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentPath = window.location.pathname;
    const loginRole = sessionStorage.getItem("loginRole");

    // केस 1: यूजर लॉग इन नहीं है
    if (!user) {
      if (currentPath !== "/login") {
        console.log("AuthGuard: User not logged in, redirecting to /login from:", currentPath);
        setLocation("/login");
      }
      return;
    }

    // केस 2: यूजर लॉग इन है लेकिन उसका रोल अभी तक निर्धारित नहीं हुआ है (initial state)
    // यह 'Become a Seller' फ्लो को सुनिश्चित करेगा
    if (user.role === null || user.role === undefined) { 
        if (loginRole === "seller") { // अगर loginRole 'seller' है
            // उसे /register-seller पर भेजें, भले ही currentPath कुछ भी हो
            if (currentPath !== "/register-seller") {
                console.log("AuthGuard: User logged in with default/null role, 'seller' flow, redirecting to /register-seller from:", currentPath);
                setLocation("/register-seller");
            }
            sessionStorage.removeItem("loginRole"); // उपयोग के बाद फ़्लैग हटा दें
            return; // रीडायरेक्ट के बाद बाहर निकलें
        } 
        // अगर loginRole 'seller' नहीं है और user.role भी null है,
        // तो इसका मतलब है कि यह एक सामान्य लॉग इन यूजर है जिसका कोई खास रोल नहीं है।
        // इसे होम पेज पर भेजें, बशर्ते यह पहले से होम या लॉगिन पर न हो।
        if (currentPath !== "/" && currentPath !== "/login") {
            console.log("AuthGuard: Logged in user with no specific role, redirecting to / (Home).");
            setLocation("/");
            return; // रीडायरेक्ट के बाद बाहर निकलें
        }
        // अगर user.role null है और loginRole भी 'seller' नहीं है,
        // और currentPath या तो '/' या '/login' या '/register-seller' है,
        // तो यहीं रहने दें और children रेंडर करें.
        return;
    }

    // केस 3: यूजर लॉग इन है और user.role सेट है
    switch (user.role) {
      case "approved-seller":
        if (currentPath !== "/seller-dashboard") {
          console.log("AuthGuard: User is approved-seller, redirecting to /seller-dashboard.");
          setLocation("/seller-dashboard");
        }
        break;
      case "not-approved-seller": 
        if (currentPath !== "/seller-status" && currentPath !== "/register-seller" && currentPath !== "/seller-dashboard") {
          console.log("AuthGuard: User is not-approved-seller, redirecting to /seller-status.");
          setLocation("/seller-status");
        }
        break;
      case "admin":
        if (currentPath !== "/admin-dashboard") {
          console.log("AuthGuard: User is admin, redirecting to /admin-dashboard.");
          setLocation("/admin-dashboard");
        }
        break;
      case "delivery":
        if (currentPath !== "/delivery-dashboard") {
          console.log("AuthGuard: User is delivery, redirecting to /delivery-dashboard.");
          setLocation("/delivery-dashboard");
        }
        break;
      default:
        // ✅ यहाँ बदलाव: अगर user.role डिफाइंड है लेकिन इनमें से कोई भी नहीं है,
        // और यूजर होम या लॉगिन पेज पर नहीं है, तो उसे होम पर भेजें।
        // यह उन यूजर्स के लिए है जो लॉग इन हैं लेकिन उनका कोई विशेष भूमिका नहीं है
        // और वे किसी गलत पेज पर फंस गए हैं।
        if (currentPath !== "/" && currentPath !== "/login") {
            console.log("AuthGuard: Logged in user with unrecognized role, redirecting to / (Home).");
            setLocation("/");
        }
        break;
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  // यदि कोई रीडायरेक्ट नहीं होता है, तो बच्चे के कॉम्पोनेंट रेंडर करें
  return <>{children}</>;
}
