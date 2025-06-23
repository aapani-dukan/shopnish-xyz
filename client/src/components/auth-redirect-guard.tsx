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
      // यदि उपयोगकर्ता किसी भी लॉगिन/रजिस्ट्रेशन पेज पर नहीं है तो /auth पर रीडायरेक्ट करें
      if (!location.startsWith("/auth") && !location.startsWith("/login") && !location.startsWith("/admin-login")) {
        navigate("/auth"); // ✅ Google साइन-इन के लिए AuthPage पर रीडायरेक्ट करें
      }
      return;
    }

    // ✅ लॉग इन है → भूमिका-आधारित रीडायरेक्ट
    switch (user.role) {
      case "seller": {
        // अनुमोदित विक्रेता डैशबोर्ड पर जाते हैं
        // लंबित विक्रेता अपनी स्थिति देखने के लिए seller-status पर जाते हैं
        // जो विक्रेता अभी तक अप्लाई नहीं किए हैं या रिजेक्ट हो गए हैं (और फिर से अप्लाई कर सकते हैं) वे seller-apply पर जाते हैं
        const approvalStatus = user.seller?.approvalStatus;
        let targetPath = "/seller-apply"; // डिफ़ॉल्ट रूप से पंजीकरण पेज

        if (approvalStatus === "approved") {
          targetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          targetPath = "/seller-status"; // ✅ seller-pending की जगह seller-status
        }
        // यदि यूजर seller-apply पर है और उसका स्टेटस pending/approved है तो उसको seller-status या dashboard पर भेजें
        if (location.startsWith("/seller-apply") && (approvalStatus === "approved" || approvalStatus === "pending")) {
             navigate(targetPath);
             return;
        }

        // यदि वर्तमान लोकेशन टारगेट पाथ नहीं है तो रीडायरेक्ट करें
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
        // यदि यूजर ग्राहक है या कोई अन्य भूमिका है, तो होमपेज पर रीडायरेक्ट करें
        if (!location.startsWith("/")) navigate("/");
    }
  }, [user, loading, location, navigate]);

  return null; // कोई UI नहीं – केवल लॉजिक
}
