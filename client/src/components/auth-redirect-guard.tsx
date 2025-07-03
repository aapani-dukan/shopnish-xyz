// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, isLoadingAuth } = useAuth();

  useEffect(() => {
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("Current user:", user);
    console.log("Current location:", location);

    if (isLoadingAuth) {
        console.log("AuthRedirectGuard: Still loading auth, returning.");
        return;
    }

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

    if (isPublic) {
        console.log("AuthRedirectGuard: Current path is public, returning.");
        return;
    }

    // 🚫 लॉग इन नहीं है → लॉगिन पेज पर रीडायरेक्ट करें
    if (!user) {
        console.log("AuthRedirectGuard: User not logged in, checking redirect.");
        if (!location.startsWith("/auth") && !location.startsWith("/login") && !location.startsWith("/admin-login")) {
            console.log("AuthRedirectGuard: Redirecting to /auth.");
            navigate("/auth");
        }
        return;
    }

    // ✅ लॉग इन है → भूमिका-आधारित रीडायरेक्ट
    console.log("AuthRedirectGuard: User logged in, checking role-based redirect for role:", user.role);

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
          console.log(`AuthRedirectGuard: Seller on /seller-apply, redirecting to ${targetPath}`);
          navigate(targetPath);
          return;
        }

        if (!location.startsWith(targetPath)) {
          console.log(`AuthRedirectGuard: Seller not on target path, redirecting to ${targetPath}`);
          navigate(targetPath);
        }
        return;
      }

      case "admin":
        if (!location.startsWith("/admin-dashboard")) {
          console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
          navigate("/admin-dashboard");
        }
        return;

      case "delivery":
        if (!location.startsWith("/delivery-dashboard")) {
          console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
          navigate("/delivery-dashboard");
        }
        return;

      case "customer":
      default:
        // यह वह जगह है जहाँ आप फंस सकते हैं अगर रोल तुरंत उपलब्ध नहीं है या डिफ़ॉल्ट है
        if (!location.startsWith("/")) {
            console.log("AuthRedirectGuard: Customer or unknown role, redirecting to /.");
            navigate("/");
        }
        return;
    }

  }, [user, isLoadingAuth, location, navigate]);

  return null;
}
