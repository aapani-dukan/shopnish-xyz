// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

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
    if (isLoadingAuth) {
      return;
    }

    if (!isAuthenticated) {
      const isPublicPath = PUBLIC_PATHS.some(path => currentPath.startsWith(path));
      if (!isPublicPath) {
        navigate("/auth", { replace: true });
      }
      return;
    }

    if (isAuthenticated && user) {
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
      
      if (currentPath === "/auth" || currentPath === "/admin-login") {
        const targetDashboard = ROLE_DASHBOARD_PATHS[user.role];
        navigate(targetDashboard, { replace: true });
        return;
      }

      // ✅ यह नया लॉजिक है जो सेलर को सही पेज पर रखेगा
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
        
        if ((!approvalStatus || approvalStatus === "rejected") && currentPath !== SELLER_SPECIFIC_PATHS.apply) {
          navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
          return;
        }
      }
      
      // ग्राहक को प्रतिबंधित पेजों से रीडायरेक्ट करें
      if (user.role === "customer" && (currentPath.startsWith("/seller-") || currentPath.startsWith("/admin-") || currentPath.startsWith("/delivery-"))) {
        navigate("/", { replace: true });
      }
      
    }
  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate, currentPath]);

  if (isLoadingAuth) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
