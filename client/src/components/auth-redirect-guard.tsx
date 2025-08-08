// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// ✅ इन रास्तों को स्पष्ट करें
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/admin-login",
  // आप यहाँ अन्य सार्वजनिक रास्तों को जोड़ सकते हैं, जैसे:
  // "/products", "/contact", "/about"
];

const ROLE_DASHBOARD_PATHS = {
  seller: "/seller-dashboard",
  admin: "/admin-dashboard",
  delivery: "/delivery-dashboard",
  customer: "/", // ग्राहक को होमपेज पर भेजें
};

const SELLER_SPECIFIC_PATHS = {
  apply: "/seller-apply",
  status: "/seller-status",
  dashboard: "/seller-dashboard",
};

export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    // जब तक ऑथेंटिकेशन डेटा लोड हो रहा है, तब तक कोई कार्रवाई न करें
    if (isLoadingAuth) {
      return;
    }

    const currentPath = location.pathname;

    // ✅ 1. 'redirectIntent' को चेक करें
    const redirectIntent = localStorage.getItem('redirectIntent');
    if (redirectIntent && isAuthenticated) {
      localStorage.removeItem('redirectIntent'); // इंटेंट का उपयोग होने के बाद हटा दें

      if (redirectIntent === "become-seller") {
        // अब, उपयोगकर्ता के रोल के आधार पर सही पेज पर भेजें
        if (user.role === "seller") {
          const approvalStatus = user.sellerProfile?.approvalStatus;
          if (approvalStatus === "pending") {
            navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
          } else if (approvalStatus === "approved") {
            navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
          } else {
            // रोल 'seller' है लेकिन स्टेटस 'null' या 'rejected' है
            navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
          }
        } else {
          // अगर रोल 'customer' है तो सीधे अप्लाई पेज पर भेजें
          navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
        }
        return;
      }
    }

    // ✅ 2. अगर उपयोगकर्ता लॉग इन है और पब्लिक ऑथ पेज पर है, तो उसे डैशबोर्ड पर भेजें
    if (isAuthenticated && (currentPath === "/auth" || currentPath === "/admin-login")) {
      const targetDashboard = ROLE_DASHBOARD_PATHS[user.role];
      navigate(targetDashboard, { replace: true });
      return;
    }
    
    // ✅ 3. अगर उपयोगकर्ता लॉग इन नहीं है और किसी प्रतिबंधित पेज पर है, तो उसे लॉग इन पेज पर भेजें
    // इस लॉजिक को तभी चलाएं जब हम पब्लिक पाथ पर ना हों
    const isPublicPath = PUBLIC_PATHS.includes(currentPath);
    if (!isAuthenticated && !isPublicPath) {
        navigate("/auth", { replace: true });
        return;
    }
    
    // ✅ 4. रोल-आधारित पहुँच नियंत्रण
    // अगर उपयोगकर्ता 'customer' है और सेलर/एडमिन रास्तों पर जाने की कोशिश कर रहा है
    if (user.role === "customer" && (currentPath.startsWith("/seller-") || currentPath.startsWith("/admin-") || currentPath.startsWith("/delivery-"))) {
        navigate("/", { replace: true });
        return;
    }
    
    // अगर उपयोगकर्ता 'seller' है, तो उसके स्टेटस के आधार पर रीडायरेक्ट करें।
    if (user.role === "seller") {
        const approvalStatus = user.sellerProfile?.approvalStatus;

        // अगर स्टेटस pending है और वह status पेज पर नहीं है
        if (approvalStatus === "pending" && currentPath !== SELLER_SPECIFIC_PATHS.status) {
            navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
            return;
        }
        // अगर स्टेटस approved है और वह dashboard पेज पर नहीं है
        if (approvalStatus === "approved" && currentPath !== SELLER_SPECIFIC_PATHS.dashboard) {
            navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
            return;
        }
        // अगर स्टेटस null/rejected है और वह apply पेज पर नहीं है
        if ((!approvalStatus || approvalStatus === "rejected") && currentPath !== SELLER_SPECIFIC_PATHS.apply) {
            navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
            return;
        }
    }
    
    // अन्य सभी मामलों में, कुछ न करें और बच्चों (children) को दिखाएं
  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate]);
  
  if (isLoadingAuth) {
    return <div>Loading...</div>;
  }
  
  return <>{children}</>;
}
