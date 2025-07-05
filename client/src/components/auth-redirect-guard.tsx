// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

// SSR-compatible intent extractor
function getIntentFromLocation(location: string): string | null {
  try {
    const url = new URL(location, "http://localhost"); // dummy base for parsing
    return url.searchParams.get("intent");
  } catch {
    return null;
  }
}

// सार्वजनिक पथों की सूची
const PUBLIC_PATHS = [
  "/", // ✅ होम पेज को यहाँ रखें, लेकिन इसे विशेष रूप से हैंडल करेंगे
  "/product",
  "/cart",
  "/checkout",
  "/auth",
  "/login",
  "/admin-login",
  "/__/auth/handler",
];

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const intent = getIntentFromLocation(location);
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("isAuthenticated:", isAuthenticated);
    console.log("Current user (UUID):", user?.uuid || "null");
    console.log("Current location:", location);
    console.log("Intent:", intent);

    // ✅ Step 1: प्रमाणीकरण लोड होने तक प्रतीक्षा करें
    if (isLoadingAuth) {
      console.log("AuthRedirectGuard: Still loading auth, returning.");
      return;
    }

    // ✅ जांचें कि क्या वर्तमान स्थान एक सार्वजनिक पथ है (auth, login, handler को छोड़कर)
    // हम चाहते हैं कि यूजर /auth पर जाए, भले ही / होम पेज पब्लिक हो।
    const isActuallyPublicPath = PUBLIC_PATHS.some(
      (path) => 
        (location === path && path !== "/auth" && path !== "/login" && path !== "/admin-login") || // सटीक मैच, लेकिन लॉगिन/एडमिन-लॉगिन/auth को पब्लिक न मानें इस संदर्भ में
        (path.endsWith("/") && location.startsWith(path) && path !== "/auth/") || 
        (path === "/__/auth/handler" && location.includes(path)) 
    );
    // होम पेज को विशेष रूप से हैंडल करें ताकि यह अनधिकृत होने पर /auth पर जा सके
    const isHome = location === "/";


    // 🔒 स्टेप 2: यूज़र लॉगिन नहीं है
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in.");
      
      // यदि यूजर /auth, /login, /admin-login पर नहीं है
      // और वह किसी वास्तव में पब्लिक पथ पर नहीं है (जैसे कि /product),
      // और वह Firebase handler पर भी नहीं है,
      // तो उसे /auth पर रीडायरेक्ट करें।
      if (
        !location.startsWith("/auth") &&
        !location.startsWith("/login") &&
        !location.startsWith("/admin-login") &&
        !location.includes("/__/auth/handler") &&
        !isActuallyPublicPath // यदि यह वास्तव में सार्वजनिक नहीं है (जैसे /product)
      ) {
        console.log("AuthRedirectGuard: Not on auth/login/public path, redirecting to /auth.");
        navigate("/auth");
        return;
      } 
      // ✅ यदि यूजर होम पेज पर है और लॉग इन नहीं है, तो उसे /auth पर रीडायरेक्ट करें
      else if (isHome && !location.startsWith("/auth")) { // सुनिश्चित करें कि हम पहले से /auth पर नहीं हैं
          console.log("AuthRedirectGuard: User not logged in and on home page, redirecting to /auth.");
          navigate("/auth");
          return;
      }
      console.log("AuthRedirectGuard: On a public/auth/handler path, staying put.");
      return; // सार्वजनिक पथों पर रहने दें
    }

    // 🔓 स्टेप 3: यूज़र लॉगिन है (`isAuthenticated` अब true है)
    console.log(
      "AuthRedirectGuard: User is logged in. Current role:",
      user?.role
    );

    // यदि यूजर लॉगिन/auth पेज पर है लेकिन पहले से ही लॉग इन है, तो उसे उसकी भूमिका के आधार पर रीडायरेक्ट करें
    if (location.startsWith("/auth") || location.startsWith("/login") || location.startsWith("/admin-login")) {
      let targetPath = "/"; // डिफ़ॉल्ट रूप से ग्राहक होम
      if (user?.role === "seller") {
        const approvalStatus = user.seller?.approvalStatus;
        if (approvalStatus === "approved") {
          targetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          targetPath = "/seller-status";
        } else {
          targetPath = "/seller-apply"; // यदि अभी तक आवेदन नहीं किया है
        }
      } else if (user?.role === "admin") {
        targetPath = "/admin-dashboard";
      } else if (user?.role === "delivery") {
        targetPath = "/delivery-dashboard";
      }

      console.log(`AuthRedirectGuard: Logged in user on auth page, redirecting to ${targetPath}.`);
      navigate(targetPath);
      return; // रीडायरेक्ट के बाद बाहर निकलें
    }

    // स्टेप 4: रोल-आधारित संरक्षित मार्ग रीडायरेक्ट (लॉगिन/ऑथ पेज पर नहीं होने पर)
    if (!user?.role) {
      console.warn("AuthRedirectGuard: User logged in but role is missing. Defaulting to home.");
      if (location !== "/") {
        navigate("/");
      }
      return;
    }

    let intendedRolePath: string | null = null;

    switch (user.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus;
        if (approvalStatus === "approved") {
          intendedRolePath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          intendedRolePath = "/seller-status";
        } else {
          intendedRolePath = "/seller-apply";
        }

        // यदि विक्रेता अपने अपेक्षित पाथ पर है या /seller-apply पर है
        if (location.startsWith(intendedRolePath) || location.startsWith("/seller-apply")) {
            // यदि विक्रेता /seller-apply पर है और उसका आवेदन अनुमोदित/लंबित है
            if (location.startsWith("/seller-apply") && (approvalStatus === "approved" || approvalStatus === "pending")) {
                if (location !== intendedRolePath) {
                    console.log(`AuthRedirectGuard: Seller on /seller-apply with status ${approvalStatus}, redirecting to ${intendedRolePath}`);
                    navigate(intendedRolePath);
                    return;
                }
            }
            // यदि वे पहले से ही अपने सही पाथ पर हैं, तो कुछ न करें
            console.log(`AuthRedirectGuard: Seller already on correct seller path (${location}). No redirect.`);
            return;
        }
        
        // यदि विक्रेता किसी गैर-विक्रेता संरक्षित पथ पर है या अपने सही डैशबोर्ड पर नहीं है
        if (
          !location.startsWith("/seller-") && 
          !location.startsWith("/admin-") && 
          !location.startsWith("/delivery-") && 
          !isActuallyPublicPath // यदि सार्वजनिक नहीं है
        ) {
          console.log(`AuthRedirectGuard: Seller on non-seller/protected path, redirecting to ${intendedRolePath}`);
          navigate(intendedRolePath);
          return;
        }
        break;
      }

      case "admin":
        intendedRolePath = "/admin-dashboard";
        if (!location.startsWith(intendedRolePath)) {
          console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
          navigate(intendedRolePath);
          return;
        }
        break;

      case "delivery":
        intendedRolePath = "/delivery-dashboard";
        if (!location.startsWith(intendedRolePath)) {
          console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
          navigate(intendedRolePath);
          return;
        }
        break;

      case "customer":
      default:
        // ✅ ग्राहक को /seller-apply पर जाने दें यदि intent "become-seller" है
        if (intent === "become-seller" && location.startsWith("/seller-apply")) {
          console.log("AuthRedirectGuard: Customer wants to become seller, allowing access to /seller-apply");
          return; // उन्हें यहीं रहने दें
        }

        // यदि ग्राहक किसी भी संरक्षित विक्रेता/एडमिन/डिलीवरी पेज पर है, तो होम पर रीडायरेक्ट करें
        if (
          location.startsWith("/seller-") ||
          location.startsWith("/admin-") ||
          location.startsWith("/delivery-")
        ) {
          console.log("AuthRedirectGuard: Customer or unknown role on restricted page, redirecting to /.");
          navigate("/");
          return;
        }

        // यदि ग्राहक किसी वास्तव में सार्वजनिक पथ पर है (होम को छोड़कर), तो उसे वहीं रहने दें
        if (isActuallyPublicPath && !isHome) { // होम को यहां से बाहर रखें
            console.log("AuthRedirectGuard: Customer on public path (not home). No redirect.");
            return;
        }

        // ✅ यदि ग्राहक होम पर है और कोई विशेष मामला नहीं है, तो उसे वहीं रहने दें
        if (isHome) {
            console.log("AuthRedirectGuard: Customer on home page. Staying put.");
            return;
        }

        // यदि ग्राहक किसी ऐसे पथ पर है जो सार्वजनिक नहीं है और न ही होम है, तो होम पर रीडायरेक्ट करें
        if (!isActuallyPublicPath && !isHome) {
          console.log("AuthRedirectGuard: Customer not on home/public path, redirecting to /.");
          navigate("/");
          return;
        }
        break;
    }

    // अंतिम कैच-ऑल: यदि कोई विशिष्ट रीडायरेक्ट नहीं हुआ है और यूजर अपने अपेक्षित रोल पाथ पर नहीं है
    // और वह ग्राहक/अज्ञात भूमिका का है और वर्तमान में एक गैर-सार्वजनिक/गैर-होम पथ पर है
    if (
        isAuthenticated && 
        !isLoadingAuth && 
        user?.role === "customer" && // केवल ग्राहकों के लिए
        !isActuallyPublicPath && 
        !isHome
    ) {
        console.log("AuthRedirectGuard: Logged in customer on unhandled non-public/non-home path, redirecting to /.");
        navigate("/");
        return;
    }


  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]);

  return null; // गार्ड कुछ भी रेंडर नहीं करता है, केवल रीडायरेक्ट करता है
}
