// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// सार्वजनिक पथों की सूची
const PUBLIC_PATHS = [
  "/",
  "/product/", // /product/something के लिए
  "/cart",
  "/checkout",
  "/auth", // AuthPage खुद एक पब्लिक पाथ है जहां कोई भी जा सकता है
  // अन्य सार्वजनिक पथ यहाँ जोड़ें
];

// रोल-विशिष्ट डैशबोर्ड पथ (रीडायरेक्ट लक्ष्य)
const ROLE_DASHBOARD_PATHS = {
  seller: "/seller-dashboard",
  admin: "/admin-dashboard",
  delivery: "/delivery-dashboard",
  customer: "/", // ग्राहक के लिए होम पेज
};

// विक्रेता-संबंधित विशेष पथ
const SELLER_SPECIFIC_PATHS = {
  apply: "/seller-apply",
  status: "/seller-status",
  dashboard: "/seller-dashboard", // डैशबोर्ड को यहाँ भी शामिल करें
};

export function AuthRedirectGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const intent = localStorage.getItem('redirectIntent'); // 'redirectIntent' का उपयोग करें

  // ✅ useAuth से user, isLoadingAuth, isAuthenticated सीधे प्राप्त करें
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    console.group("AuthRedirectGuard Log");
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("isAuthenticated:", isAuthenticated);
    console.log("Current user (UID):", user?.uid || "null");
    console.log("Current location:", location.pathname);
    console.log("Intent from localStorage:", intent);
    console.log("User role from AuthContext:", user?.role);
    // ✅ user.seller?.approvalStatus का उपयोग करें, जैसा कि आपके useAuth में है
    console.log("User seller approval status from AuthContext:", user?.seller?.approvalStatus);

    // Step 1: प्रमाणीकरण लोड होने तक प्रतीक्षा करें
    if (isLoadingAuth) {
      console.log("AuthRedirectGuard: Still loading auth, returning.");
      console.groupEnd();
      return;
    }

    const currentPath = location.pathname;

    // चेक करें कि क्या वर्तमान पथ किसी सार्वजनिक पथ से शुरू होता है
    const isOnPublicPath = PUBLIC_PATHS.some(
      (path) => currentPath === path || (path.endsWith("/") && currentPath.startsWith(path))
    );

    // ✅ AUTH_SPECIFIC_PATHS को PUBLIC_PATHS में मिलाया गया है, तो इसकी अलग से जांच की आवश्यकता नहीं है
    // यदि /auth एक सार्वजनिक पथ है, तो इसका अलग से ट्रैक रखने की आवश्यकता नहीं है

    // --- ✅ प्राथमिकता 1: 'become-seller' इंटेंट को हैंडल करें ---
    if (intent === "become-seller") {
      console.log("AuthRedirectGuard: 'become-seller' intent found.");

      // यदि उपयोगकर्ता लॉग इन नहीं है और 'become-seller' इंटेंट है, तो उसे /auth पर भेजें
      if (!isAuthenticated) {
        console.log("AuthRedirectGuard: Not authenticated with 'become-seller' intent. Redirecting to /auth.");
        navigate("/auth", { replace: true });
        console.groupEnd();
        return;
      }

      // यदि उपयोगकर्ता लॉग इन है और 'become-seller' इंटेंट है
      if (isAuthenticated) {
        let sellerTargetPath: string;
        const approvalStatus = user?.seller?.approvalStatus;

        if (user?.role === "seller") {
          if (approvalStatus === "approved") {
            sellerTargetPath = SELLER_SPECIFIC_PATHS.dashboard;
          } else if (approvalStatus === "pending") {
            sellerTargetPath = SELLER_SPECIFIC_PATHS.status;
          } else { // भूमिका 'seller' है लेकिन कोई अनुमोदन स्थिति नहीं या अज्ञात
            sellerTargetPath = SELLER_SPECIFIC_PATHS.apply;
          }
        } else { // भूमिका 'customer' या कुछ और है, उन्हें आवेदन करने दें
          sellerTargetPath = SELLER_SPECIFIC_PATHS.apply;
        }

        // यदि उपयोगकर्ता पहले से ही सही सेलर पाथ पर नहीं है, तो रीडायरेक्ट करें
        if (currentPath !== sellerTargetPath && !currentPath.startsWith(sellerTargetPath + '/')) {
          console.log(`AuthRedirectGuard: Logged in with 'become-seller' intent, redirecting to designated seller path: ${sellerTargetPath}`);
          localStorage.removeItem('redirectIntent'); // इंटेंट को उपयोग के बाद हटा दें
          navigate(sellerTargetPath, { replace: true });
          console.groupEnd();
          return;
        }
        console.log("AuthRedirectGuard: User already on correct seller intent path. Staying put.");
        localStorage.removeItem('redirectIntent'); // इंटेंट को उपयोग के बाद हटा दें
        console.groupEnd();
        return;
      }
    }

    // --- अब सामान्य ऑथेंटिकेशन और रीडायरेक्ट लॉजिक (जब कोई 'become-seller' इंटेंट न हो) ---

    // --- 🔒 यूज़र लॉगिन नहीं है ---
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in.");

      // यदि यूजर किसी सार्वजनिक पाथ पर है, तो उसे वहीं रहने दें
      if (isOnPublicPath) {
        console.log("AuthRedirectGuard: Not logged in user on public path. Staying put.");
        console.groupEnd();
        return;
      }

      // यदि यूजर लॉगिन नहीं है और किसी प्रतिबंधित गैर-सार्वजनिक पाथ पर है, तो /auth पर रीडायरेक्ट करें
      console.log("AuthRedirectGuard: Not logged in user on restricted non-public path. Redirecting to /auth.");
      navigate("/auth", { replace: true });
      console.groupEnd();
      return;
    }

    // --- 🔓 यूज़र लॉगिन है (isAuthenticated अब true है और कोई 'become-seller' इंटेंट नहीं था) ---
    console.log(
      "AuthRedirectGuard: User is logged in. Current role:",
      user?.role,
      "Approval Status:",
      user?.seller?.approvalStatus // ✅ user.seller?.approvalStatus
    );

    // ✅ यदि उपयोगकर्ता लॉगिन है और किसी 'auth-specific' पेज पर है (जो अब सार्वजनिक है)
    // तो उसे रोल-आधारित डैशबोर्ड पर भेजें।
    if (currentPath === "/auth") { // केवल /auth को हैंडल करें
        const targetDashboard = ROLE_DASHBOARD_PATHS[user?.role || 'customer']; // डिफ़ॉल्ट रूप से ग्राहक का डैशबोर्ड
        if (currentPath !== targetDashboard) { // यदि वे पहले से सही डैशबोर्ड पर नहीं हैं
            console.log(`AuthRedirectGuard: Logged in user on auth page. Redirecting to ${targetDashboard}.`);
            navigate(targetDashboard, { replace: true });
            console.groupEnd();
            return;
        }
    }

    // --- रोल-आधारित रीडायरेक्ट लॉजिक ---
    let actualTargetPath: string | null = null;

    switch (user?.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus; // ✅ user.seller?.approvalStatus
        if (approvalStatus === "approved") {
          actualTargetPath = SELLER_SPECIFIC_PATHS.dashboard;
        } else if (approvalStatus === "pending") {
          actualTargetPath = SELLER_SPECIFIC_PATHS.status;
        } else { // भूमिका 'seller' है लेकिन कोई अनुमोदन स्थिति नहीं या अज्ञात
          actualTargetPath = SELLER_SPECIFIC_PATHS.apply;
        }

        // यदि विक्रेता संबंधित पाथ पर नहीं है (seller-dashboard, seller-status, seller-apply)
        // और वर्तमान पाथ डैशबोर्ड/स्टेटस/अप्लाई के अलावा कुछ और है, तो रीडायरेक्ट करें
        if (!currentPath.startsWith("/seller-") && actualTargetPath && currentPath !== actualTargetPath && !currentPath.startsWith(actualTargetPath + '/')) {
          console.log(`AuthRedirectGuard: Seller on non-seller path, redirecting to ${actualTargetPath}`);
          navigate(actualTargetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;
      }

      case "admin":
        actualTargetPath = ROLE_DASHBOARD_PATHS.admin;
        if (!currentPath.startsWith(actualTargetPath)) {
          console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
          navigate(actualTargetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;

      case "delivery":
        actualTargetPath = ROLE_DASHBOARD_PATHS.delivery;
        if (!currentPath.startsWith(actualTargetPath)) {
          console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
          navigate(actualTargetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;

      case "customer":
      default:
        // यदि ग्राहक या अज्ञात भूमिका एक प्रतिबंधित पृष्ठ पर है
        if (
          currentPath.startsWith("/seller-") ||
          currentPath.startsWith("/admin-") ||
          currentPath.startsWith("/delivery-")
        ) {
          // ✅ यह वह हिस्सा है जिसे हम हल कर रहे हैं।
          // यदि ग्राहक /seller-status पर है, तो उसे बने रहने दें
          if (currentPath.startsWith(SELLER_SPECIFIC_PATHS.status)) {
            console.log("AuthRedirectGuard: Customer on /seller-status page. Allowing access.");
            console.groupEnd();
            return;
          }
          // अन्य प्रतिबंधित पृष्ठों के लिए, उसे होम पर रीडायरेक्ट करें
          console.log("AuthRedirectGuard: Customer or unknown role on restricted non-status page, redirecting to /.");
          navigate("/", { replace: true });
          console.groupEnd();
          return;
        }
        break;
    }

    console.log("AuthRedirectGuard: Logged in user on appropriate path, staying put.");
    console.groupEnd();

  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate, intent]);

  return null;
}
