// src/guards/AuthRedirectGuard.tsx
import { useEffect, useState } from "react";
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
    // अगर auth अभी लोड हो रहा है, तो कुछ न करें।
    if (isLoadingAuth) {
      return;
    }
    
    // अगर user डेटा उपलब्ध नहीं है (और हम लॉग इन नहीं हैं), तो कुछ न करें।
    if (!isAuthenticated) {
      // अगर हम किसी प्रतिबंधित रास्ते पर हैं, तो लॉगिन पेज पर भेजें।
      if (!PUBLIC_PATHS.some(path => currentPath.startsWith(path))) {
        navigate("/auth", { replace: true });
      }
      return;
    }
    
    // अगर user डेटा उपलब्ध है
    if (user) {
      const redirectIntent = localStorage.getItem('redirectIntent');

      // 1. 'become-seller' इंटेंट को प्राथमिकता दें
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
      
      // 2. पब्लिक ऑथ पेज से रीडायरेक्ट
      if (currentPath === "/auth" || currentPath === "/admin-login") {
        const targetDashboard = ROLE_DASHBOARD_PATHS[user.role];
        navigate(targetDashboard, { replace: true });
        return;
      }
      
      // 3. रोल-आधारित पहुँच नियंत्रण
      if (user.role === "customer") {
        if (currentPath.startsWith("/seller-") || currentPath.startsWith("/admin-") || currentPath.startsWith("/delivery-")) {
          navigate("/", { replace: true });
        }
      } else if (user.role === "seller") {
        const approvalStatus = user.sellerProfile?.approvalStatus;
        if (approvalStatus === "pending" && currentPath !== SELLER_SPECIFIC_PATHS.status) {
          navigate(SELLER_SPECIFIC_PATHS.status, { replace: true });
        } else if (approvalStatus === "approved" && currentPath !== SELLER_SPECIFIC_PATHS.dashboard) {
          navigate(SELLER_SPECIFIC_PATHS.dashboard, { replace: true });
        } else if ((!approvalStatus || approvalStatus === "rejected") && currentPath !== SELLER_SPECIFIC_PATHS.apply) {
          navigate(SELLER_SPECIFIC_PATHS.apply, { replace: true });
        }
      }
    }

  }, [user, isLoadingAuth, isAuthenticated, currentPath, navigate]);
  
  if (isLoadingAuth) {
    return <div>Loading...</div>;
  }
  
  return <>{children}</>;
}
