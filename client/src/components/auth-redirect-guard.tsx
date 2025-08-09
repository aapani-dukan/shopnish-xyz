// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// ✅ इन रास्तों को स्पष्ट करें
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/admin-login",
  "/products",
  "/product",
  "/search",
  "/cart",
  "/checkout",
  "/seller-apply",
];

const ROLE_DASHBOARD_PATHS = {
  seller: "/seller-dashboard",
  admin: "/admin-dashboard",
  delivery: "/delivery-dashboard",
  customer: "/",
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

  const currentPath = location.pathname;

  useEffect(() => {
    // जब तक ऑथेंटिकेशन डेटा लोड हो रहा है, तब तक कोई कार्रवाई न करें
    if (isLoadingAuth) {
      return;
    }

    // अगर उपयोगकर्ता लॉग इन नहीं है और किसी प्रतिबंधित पेज पर है, तो उसे लॉग इन पेज पर भेजें
    const isPublicPath = PUBLIC_PATHS.includes(currentPath);
    if (!isAuthenticated && !isPublicPath) {
      navigate("/auth", { replace: true });
      return;
    }

    // अगर उपयोगकर्ता लॉग इन है, तो रीडायरेक्ट लॉजिक चलाएं
    if (isAuthenticated && user) {

      // ✅ 1. 'redirectIntent' को प्राथमिकता दें
      const redirectIntent = localStorage.getItem('redirectIntent');
      if (redirectIntent === "become-seller") {
        localStorage.removeItem('redirectIntent');

        if (user.role === "seller") {
          const approvalStatus = user.sellerProfile?.approvalStatus;
          if (approvalStatus === "pending") {
            navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
          } else if (approvalStatus === "approved") {
            navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
          } else {
            navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
          }
        } else {
          navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
        }
        return;
      }

      // ✅ 2. अगर उपयोगकर्ता लॉग इन है और पब्लिक ऑथ पेज पर है, तो उसे डैशबोर्ड पर भेजें
      if (currentPath === "/auth" || currentPath === "/admin-login") {
        const targetDashboard = ROLE_DASHBOARD_PATHS[user.role];
        navigate(targetDashboard, { replace: true });
        return;
      }

      // ✅ 3. रोल-आधारित पहुँच नियंत्रण
      if (user.role === "customer" && (currentPath.startsWith("/seller-") || currentPath.startsWith("/admin-") || currentPath.startsWith("/delivery-"))) {
        navigate("/", { replace: true });
        return;
      }

      // ✅ 4. अगर उपयोगकर्ता 'seller' है, तो उसके स्टेटस के आधार पर रीडायरेक्ट करें।
      // यह लॉजिक केवल उन रास्तों के लिए चलेगा जहाँ सेलर का स्टेटस चेक करना जरूरी है
      const approvalStatus = user.sellerProfile?.approvalStatus;
      
      if (user.role === "seller" && currentPath !== SELLER_SPECIFIC_PATHS.status && currentPath !== SELLER_SPECIFIC_PATHS.dashboard && currentPath !== SELLER_SPECIFIC_PATHS.apply) {
        if (approvalStatus === "pending") {
          navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
          return;
        } else if (approvalStatus === "approved") {
          navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
          return;
        } else if (!approvalStatus || approvalStatus === "rejected") {
          navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
          return;
        }
      }
    }
  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate, currentPath]);

  if (isLoadingAuth) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
