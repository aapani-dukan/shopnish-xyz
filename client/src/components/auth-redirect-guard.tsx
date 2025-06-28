// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

/**
 * Centralized route-guard
 * - Allows access to public pages without login
 * - Redirects to appropriate dashboard based on user role
 */
export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // 🔓 पब्लिक पाथ्स जिन्हें लॉगिन की आवश्यकता नहीं है
    const publicPaths = [
      "/",
      "/product", // /product/:id
      "/cart",
      "/checkout",
      "/auth",
      "/login"
    ];

    const isPublic = publicPaths.some((path) => location.startsWith(path));
    if (isPublic) return;

    // ❌ यूज़र लॉग इन नहीं है
    if (!user) {
      if (!location.startsWith("/auth") && !location.startsWith("/login") && !location.startsWith("/admin-login")) {
        navigate("/auth");
      }
      return;
    }

    // ❗ role लोड नहीं हुआ तो कोई redirect मत करो — वर्ना loop बन सकता है
    if (!user.role) return;

    // ✅ Role-based Redirect
    switch (user.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus;

        // ❗ approvalStatus missing है तो कोई redirect मत करो
        if (!approvalStatus) return;

        let targetPath = "/seller-apply";
        if (approvalStatus === "approved") targetPath = "/seller-dashboard";
        else if (approvalStatus === "pending") targetPath = "/seller-status";

        // ❌ अगर पहले से टारगेट पाथ पर हो तो redirect मत करो
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
        if (!location.startsWith("/")) {
          navigate("/");
        }
    }
  }, [user, loading, location, navigate]);

  return null;
}
