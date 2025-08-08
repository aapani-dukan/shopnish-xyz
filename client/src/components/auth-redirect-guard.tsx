// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// सार्वजनिक पथों की सूची
const PUBLIC_PATHS = [
  "/",
  "/product",
  "/cart",
  "/checkout",
  "/auth",
  "/admin-login", // ✅ Admin login भी पब्लिक है
];

// रोल-विशिष्ट डैशबोर्ड पथ (रीडायरेक्ट लक्ष्य)
const ROLE_DASHBOARD_PATHS = {
  seller: "/seller-dashboard",
  admin: "/admin-dashboard",
  delivery: "/delivery-dashboard",
  customer: "/",
};

// विक्रेता-संबंधित विशेष पथ
const SELLER_SPECIFIC_PATHS = {
  apply: "/seller-apply",
  status: "/seller-status",
  dashboard: "/seller-dashboard",
};

// ✅ AuthRedirectGuard अब एक हुक नहीं, बल्कि एक कंपोनेंट है जो children लेता है
export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoadingAuth, isAuthenticated } = useAuth();
  
  // ✅ फ़्रंटएंड राउटिंग के लिए एक बेहतर तरीका
  useEffect(() => {
    if (isLoadingAuth || !user) {
        // Auth के लोड होने या उपयोगकर्ता के लॉग इन ना होने पर कुछ न करें
        return;
    }

    const currentPath = location.pathname;
    
    // ✅ 1. अगर उपयोगकर्ता authenticated है और /auth या /admin-login पर है, तो उसे उसके डैशबोर्ड पर भेजें।
    if (isAuthenticated && (currentPath === "/auth" || currentPath === "/admin-login")) {
      const targetDashboard = ROLE_DASHBOARD_PATHS[user.role];
      navigate(targetDashboard, { replace: true });
      return;
    }
    
    // ✅ 2. अगर उपयोगकर्ता 'customer' है और किसी सेलर/एडमिन पेज पर है, तो उसे '/' पर भेजें।
    if (user.role === "customer" && (currentPath.startsWith("/seller-") || currentPath.startsWith("/admin-") || currentPath.startsWith("/delivery-"))) {
        navigate("/", { replace: true });
        return;
    }
    
    // ✅ 3. अगर उपयोगकर्ता 'seller' है, तो उसके स्टेटस के आधार पर रीडायरेक्ट करें।
    if (user.role === "seller") {
        const approvalStatus = user.sellerProfile?.approvalStatus;
        
        if (approvalStatus === "pending" && currentPath !== SELLER_SPECIFIC_PATHS.status) {
            navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
            return;
        }
        if (approvalStatus === "approved" && currentPath !== SELLER_SPECIFIC_PATHS.dashboard) {
            navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
            return;
        }
        if (!approvalStatus && currentPath !== SELLER_SPECIFIC_PATHS.apply) {
            navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
            return;
        }
    }

    // बाकी सभी मामलों में, बच्चों (children) को दिखाएं
  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate]);
  
  // ✅ जब तक auth लोड हो रहा है, तब तक कुछ दिखाएं
  if (isLoadingAuth) {
    return <div>Loading...</div>;
  }
  
  // ✅ जब auth लोड हो जाए, तो बच्चों को दिखाएं
  return <>{children}</>;
}
