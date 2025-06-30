// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react"; import { useAuth } from "@/hooks/useAuth"; import { useLocation } from "wouter";

/**

Centralized route-guard

Allows access to public pages without login


Redirects to appropriate dashboard based on user role */ export function AuthRedirectGuard() { const [location, navigate] = useLocation(); const { user, isLoadingAuth } = useAuth();



useEffect(() => { if (isLoadingAuth) return;

// पब्लिक पाथ्स जिन्हें लॉगिन की आवश्यकता नहीं है
const publicPaths = [
  "/",
  "/product", // /product/:id के लिए
  "/cart",
  "/checkout",
  "/auth", // लॉगिन/रजिस्ट्रेशन पेज खुद पब्लिक होना चाहिए
  "/login" // सामान्य लॉगिन पेज
];
const isPublic = publicPaths.some((path) => location.startsWith(path));
if (isPublic) return;

// 🚫 लॉग इन नहीं है → लॉगिन पेज पर रीडायरेक्ट करें
if (!user) {
  if (!location.startsWith("/auth") && !location.startsWith("/login") && !location.startsWith("/admin-login")) {
    navigate("/auth");
  }
  return;
}

// ✅ लॉग इन है → भूमिका-आधारित रीडायरेक्ट
switch (user.role) {
  case "seller": {
    const approvalStatus = user.seller?.approvalStatus;
    let targetPath = "/seller-apply";

    if (approvalStatus === "approved") {
      targetPath = "/seller-dashboard";
    } else if (approvalStatus === "pending") {
      targetPath = "/seller-status";
    }

    if (location.startsWith("/seller-apply") && (approvalStatus === "approved" || approvalStatus === "pending")) {
      navigate(targetPath);
      return;
    }

    if (!location.startsWith(targetPath)) {
      navigate(targetPath);
    }
    return;
  }

  case "admin":
    if (!location.startsWith("/admin-dashboard")) {
      navigate("/admin-dashboard");
    }
    return;

  case "delivery":
    if (!location.startsWith("/delivery-dashboard")) {
      navigate("/delivery-dashboard");
    }
    return;

  case "customer":
  default:
    if (!location.startsWith("/")) navigate("/");
}

}, [user, isLoadingAuth, location, navigate]);

return null; }

