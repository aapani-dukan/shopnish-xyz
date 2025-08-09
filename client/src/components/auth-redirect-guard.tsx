// src/guards/AuthRedirectGuard.tsx
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/admin-login",
  // यहाँ अन्य सार्वजनिक रास्तों को जोड़ें
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

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || !user) {
      return;
    }

    const currentPath = location.pathname;
    const redirectIntent = localStorage.getItem('redirectIntent');

    if (redirectIntent === "become-seller") {
      localStorage.removeItem('redirectIntent');
      if (user.role === "seller") {
        const approvalStatus = user.sellerProfile?.approvalStatus;
        if (approvalStatus === "pending") {
          navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
          return;
        } else if (approvalStatus === "approved") {
          navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
          return;
        } else {
          navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
          return;
        }
      } else {
        navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
        return;
      }
    }
    
    // अगर उपयोगकर्ता authenticated है और /auth या /admin-login पर है, तो उसे उसके डैशबोर्ड पर भेजें।
    if (currentPath === "/auth" || currentPath === "/admin-login") {
      const targetDashboard = ROLE_DASHBOARD_PATHS[user.role];
      navigate(targetDashboard, { replace: true });
      return;
    }
    
    // अगर उपयोगकर्ता 'customer' है और किसी सेलर/एडमिन पेज पर है, तो उसे '/' पर भेजें।
    if (user.role === "customer" && (currentPath.startsWith("/seller-") || currentPath.startsWith("/admin-") || currentPath.startsWith("/delivery-"))) {
      navigate("/", { replace: true });
      return;
    }
    
    // अगर उपयोगकर्ता 'seller' है, तो उसके स्टेटस के आधार पर रीडायरेक्ट करें।
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

  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate]);
  
  if (isLoadingAuth) {
    return <div>Loading...</div>;
  }
  
  return <>{children}</>;
}
