// client/src/components/auth-redirect-guard.tsx

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth'; // Your centralized auth hook

export default function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 1. जब ऑथेंटिकेशन लोड हो रहा हो, तो कुछ न करें
    if (loading) {
      return;
    }

    const currentPath = window.location.pathname;
    const loginRole = sessionStorage.getItem("loginRole");

    // केस 1: यूजर लॉग इन नहीं है
    if (!user) {
      // अगर यूजर लॉग इन नहीं है और current path `/login` नहीं है, तो उसे `/login` पर भेजें
      // loginRole को यहां देखने की जरूरत नहीं क्योंकि login.tsx इसे हैंडल करेगा
      if (currentPath !== "/login") {
        console.log("AuthGuard: User not logged in, redirecting to /login from:", currentPath);
        setLocation("/login");
      }
      return;
    }

    // केस 2: यूजर लॉग इन है
    // प्राथमिकता: `sessionStorage.loginRole` को देखें अगर `user.role` अभी तक सेट नहीं हुआ है या default है
    // यह `Become a Seller` फ्लो को सुनिश्चित करेगा कि वे सीधे रजिस्ट्रेशन पर जाएं.
    if (user.role === null || user.role === undefined) { 
        if (loginRole === "seller" && currentPath !== "/register-seller") {
            console.log("AuthGuard: User logged in with default/null role, 'seller' flow, redirecting to /register-seller from:", currentPath);
            setLocation("/register-seller");
            sessionStorage.removeItem("loginRole"); // उपयोग के बाद फ़्लैग हटा दें
            return;
        }
    }

    // केस 3: यूजर लॉग इन है और user.role सेट है (या `loginRole` 'seller' नहीं था)
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
        // अगर कोई विशेष रोल नहीं है (और `loginRole` 'seller' भी नहीं था),
        // तो होम पेज पर रीडायरेक्ट करें, बशर्ते वे पहले से होम पर न हों या लॉगिन/रजिस्ट्रेशन पर न हों.
        if (currentPath !== "/" && currentPath !== "/login" && currentPath !== "/register-seller") {
          console.log("AuthGuard: User has no specific role, redirecting to / (Home).");
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
