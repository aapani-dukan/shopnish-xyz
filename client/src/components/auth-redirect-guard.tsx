// client/src/components/auth-redirect-guard.tsx

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 1. जब ऑथेंटिकेशन लोड हो रहा हो, तो कुछ न करें
    // ✅ इसे पहले रखें ताकि यूजर डेटा लोड होने तक कोई रीडायरेक्ट न हो
    if (loading) {
      return;
    }

    const currentPath = window.location.pathname;
    const loginRole = sessionStorage.getItem("loginRole"); // sessionStorage से फ्लैग पढ़ें

    // केस 1: यूजर लॉग इन नहीं है
    if (!user) {
      if (currentPath !== "/login") {
        console.log("AuthGuard: User not logged in, redirecting to /login from:", currentPath);
        setLocation("/login");
      }
      return;
    }

    // केस 2: यूजर लॉग इन है। अब उसके रोल और loginRole के आधार पर निर्णय लें।

    // A. यदि user.role अभी भी null/undefined है (यानी, भूमिका अभी तक बैकएंड से फेच नहीं हुई है),
    // तो sessionStorage.loginRole को प्राथमिकता दें।
    if (user.role === null || user.role === undefined) {
      if (loginRole === "seller") {
        // यदि 'seller' फ्लो में है, तो उसे /register-seller पर भेजें
        if (currentPath !== "/register-seller") {
          console.log("AuthGuard: User logged in with default/null role, 'seller' flow, redirecting to /register-seller from:", currentPath);
          setLocation("/register-seller");
        }
        sessionStorage.removeItem("loginRole"); // उपयोग के बाद फ्लैग हटा दें
        return;
      }
      
      // ✅ नई कंडीशन: यदि कोई loginRole टैग नहीं है (सामान्य लॉगिन)
      // और यूजर होम पेज पर नहीं है, तो उसे होम पेज पर भेजें।
      if (!loginRole && currentPath !== "/") {
          console.log("AuthGuard: Logged in user with no specific role (no loginRole tag) and null user.role, redirecting to / (Home).");
          setLocation("/");
          return;
      }
      
      // यदि user.role null है, loginRole भी null है, और वह '/', '/login', या '/register-seller' पर है,
      // तो यहीं रहने दें और children रेंडर करें।
      return;
    }

    // B. यदि user.role सेट है (useAuth से आ गया है)
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
            console.log("AuthGuard: Logged in user with unrecognized user.role, redirecting to / (Home).");
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
