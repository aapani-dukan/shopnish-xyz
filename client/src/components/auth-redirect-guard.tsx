// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, isLoadingAuth } = useAuth(); // firebaseUser को यहाँ से हटाने के बाद भी ठीक काम करेगा

  useEffect(() => {
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("Current user:", user);
    console.log("Current location:", location);

    if (isLoadingAuth) {
        console.log("AuthRedirectGuard: Still loading auth, returning.");
        return;
    }

    const publicPaths = [
      "/", // यह अक्सर होम पेज होता है, लेकिन अगर यह लॉगिन के बाद का लैंडिंग पेज नहीं है, तो इसे हटाना पड़ सकता है
      "/product", // /product/:id के लिए
      "/cart",
      "/checkout",
      // "/auth", // ✅ इसे अब पब्लिक पाथ्स से हटा दें
      // "/login" // ✅ इसे भी पब्लिक पाथ्स से हटा दें
    ];
    const isPublic = publicPaths.some((path) => location.startsWith(path));

    // ✅ यदि यूजर लॉग इन है और लॉगिन/पब्लिक पेज पर है, तो उसे रीडायरेक्ट करें
    if (user) { // यूजर लॉग इन है
        // यदि यूजर लॉगिन/रजिस्ट्रेशन पेज पर है या किसी ऐसे पब्लिक पेज पर है जहाँ से उसे रीडायरेक्ट करना चाहिए
        if (location.startsWith("/auth") || location.startsWith("/login") || location.startsWith("/admin-login")) {
            console.log("AuthRedirectGuard: User is logged in and on a login/auth page, redirecting based on role.");
            // भूमिका-आधारित रीडायरेक्ट लॉजिक यहाँ ट्रिगर होगा
        } else if (isPublic && location === "/") { // यदि यूजर होम पेज पर है और वह सिर्फ पब्लिक नहीं है बल्कि एक लैंडिंग पेज भी है
            // यदि '/' आपका लॉगिन के बाद का लैंडिंग पेज है, तो कोई रीडायरेक्ट आवश्यक नहीं है
            // यदि '/' आपका लॉगिन पेज है, तो ऊपर वाले if में शामिल होगा
            console.log("AuthRedirectGuard: User is logged in and on a general public path, no redirect needed here.");
            return;
        } else if (!isPublic) {
            // यदि यूजर लॉग इन है और एक प्राइवेट पाथ पर है, तो यहीं पर भूमिका-आधारित रीडायरेक्ट होगा
            // यह कोड 'switch (user.role)' ब्लॉक में जाएगा
        }
    } else { // 🚫 लॉग इन नहीं है
        console.log("AuthRedirectGuard: User not logged in, checking redirect.");
        if (!location.startsWith("/auth") && !location.startsWith("/login") && !location.startsWith("/admin-login")) {
            console.log("AuthRedirectGuard: Redirecting to /auth.");
            navigate("/auth");
        }
        return;
    }

    // ✅ यदि यूजर लॉग इन है, तो यहाँ से भूमिका-आधारित रीडायरेक्ट लॉजिक चलेगा
    // सुनिश्चित करें कि user.role हमेशा उपलब्ध हो
    if (!user.role) {
        console.log("AuthRedirectGuard: User logged in, but role is missing. Defaulting to customer dashboard.");
        if (!location.startsWith("/")) navigate("/");
        return;
    }

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
        // यदि यूजर कस्टमर है या भूमिका अज्ञात है, तो हमेशा / पर रीडायरेक्ट करें यदि वे पहले से वहाँ नहीं हैं
        if (!location.startsWith("/")) {
            console.log("AuthRedirectGuard: Customer or unknown role, redirecting to /.");
            navigate("/");
        }
        return;
    }

  }, [user, isLoadingAuth, location, navigate]);

  return null;
}
