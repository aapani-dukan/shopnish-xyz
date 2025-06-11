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
    const loginRole = sessionStorage.getItem("loginRole"); // sessionStorage से फ्लैग पढ़ें

    // केस 1: यूजर लॉग इन नहीं है
    if (!user) {
      // अगर यूजर लॉग इन नहीं है और current path `/login` नहीं है, तो उसे `/login` पर भेजें
      if (currentPath !== "/login") {
        console.log("AuthGuard: User not logged in, redirecting to /login from:", currentPath);
        setLocation("/login");
      }
      return;
    }

    // केस 2: यूजर लॉग इन है लेकिन उसका रोल अभी तक निर्धारित नहीं हुआ है (initial state from useAuth)
    // या उसका रोल 'seller'/'approved-seller'/'admin'/'delivery' में से कोई नहीं है।
    if (user.role === null || user.role === undefined) { 
        if (loginRole === "seller") { // यदि loginRole 'seller' है, तो उसे रजिस्ट्रेशन पर भेजें
            if (currentPath !== "/register-seller") {
                console.log("AuthGuard: User logged in with default/null role, 'seller' flow, redirecting to /register-seller from:", currentPath);
                setLocation("/register-seller");
            }
            sessionStorage.removeItem("loginRole"); // उपयोग के बाद फ्लैग हटा दें
            return;
        } 
        
        // ✅ यह नई कंडीशन है जो आपने मांगी है:
        // यदि कोई टैग नहीं है (loginRole null है), और यूजर किसी विशेष रोल के पेज पर नहीं है,
        // तो उसे होम पेज पर भेजें।
        if (!loginRole && currentPath !== "/") { // अगर loginRole नहीं है AND currentPath होम नहीं है
            console.log("AuthGuard: Logged in user with no specific role (no loginRole tag), redirecting to / (Home).");
            setLocation("/");
            return;
        }
        
        // यदि user.role null है और loginRole भी 'seller' नहीं है,
        // और currentPath या तो '/', '/login', या '/register-seller' है,
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
        // यह 'default' केस अब उन यूजर्स को हैंडल करता है जिनका user.role डिफाइंड है
        // लेकिन वह 'approved-seller', 'not-approved-seller', 'admin', या 'delivery' नहीं है,
        // और उन्हें होम पर भेजना चाहता है।
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

  return <>{children}</>;
}
