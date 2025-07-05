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
// ✅ सटीक मिलान या startWith का उपयोग करें, includes से बचें यदि यह बहुत व्यापक हो सकता है
const PUBLIC_PATHS = [
  "/",
  "/product", // /product/:id जैसे को भी कवर कर सकता है यदि यह बेस पाथ है
  "/cart",
  "/checkout",
  "/auth",
  "/login", // यदि यह /auth से अलग है
  "/admin-login", // यदि यह /auth से अलग है
  // Firebase auth handler path (महत्वपूर्ण)
  "/__/auth/handler", // यह हमेशा includes() से चेक किया जाना चाहिए
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

    // ✅ जांचें कि क्या वर्तमान स्थान एक सार्वजनिक पथ है
    const isCurrentPathPublic = PUBLIC_PATHS.some(
      (path) => 
        location === path || // सटीक मैच
        (path.endsWith("/") && location.startsWith(path)) || // जैसे /product/ के लिए
        (path === "/__/auth/handler" && location.includes(path)) // Firebase handler के लिए विशेष
    );

    // 🔒 स्टेप 2: यूज़र लॉगिन नहीं है
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in.");
      // यदि वर्तमान पथ सार्वजनिक नहीं है और Firebase auth handler नहीं है, तो /auth पर रीडायरेक्ट करें
      if (!isCurrentPathPublic) { // अब isCurrentPathPublic का उपयोग करें
        console.log("AuthRedirectGuard: Not on a public path, redirecting to /auth.");
        navigate("/auth");
        return; // रीडायरेक्ट के बाद बाहर निकलें
      }
      console.log("AuthRedirectGuard: On a public path, staying put.");
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
    // यदि user या user.role गायब है, तो भी सुरक्षित रूप से हैंडल करें
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

        // विक्रेता को /seller-apply पर अनुमति दें यदि उनका आवेदन अभी pending/rejected है या नहीं भरा है
        // लेकिन यदि उनका आवेदन approved है, तो उन्हें /seller-dashboard पर भेजें
        if (
          location.startsWith("/seller-apply") && 
          (approvalStatus === "approved" || approvalStatus === "pending")
        ) {
          if (location !== intendedRolePath) { // केवल तभी रीडायरेक्ट करें जब वे पहले से ही सही पेज पर न हों
            console.log(`AuthRedirectGuard: Seller on /seller-apply with status ${approvalStatus}, redirecting to ${intendedRolePath}`);
            navigate(intendedRolePath);
            return;
          }
        }
        
        // यदि विक्रेता किसी गैर-विक्रेता संरक्षित पथ पर है या अपने सही डैशबोर्ड पर नहीं है
        if (
          !location.startsWith("/seller-") && 
          !location.startsWith("/admin-") && // सुनिश्चित करें कि वे गलती से एडमिन/डिलीवरी पेज पर न हों
          !location.startsWith("/delivery-") && 
          !isCurrentPathPublic && // यदि सार्वजनिक नहीं है
          location !== intendedRolePath
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

        // यदि ग्राहक किसी सार्वजनिक पथ पर है, तो उसे वहीं रहने दें (होम को छोड़कर अनावश्यक रीडायरेक्ट न करें)
        if (isCurrentPathPublic) { // अब isCurrentPathPublic का उपयोग करें
            console.log("AuthRedirectGuard: Customer on public path. No redirect.");
            return;
        }

        // यदि ग्राहक होम पर नहीं है और कोई अन्य विशेष पथ नहीं है, तो होम पर रीडायरेक्ट करें
        // यह अंतिम कैच-ऑल है, सुनिश्चित करें कि यह केवल तभी ट्रिगर हो जब कहीं और जाने की कोई और वजह न हो
        if (location !== "/") {
          console.log("AuthRedirectGuard: Customer not on home/public path, redirecting to /.");
          navigate("/");
        }
        return;
    }

    // ✅ अंतिम कैच-ऑल: यदि कोई विशिष्ट रीडायरेक्ट नहीं हुआ है और यूजर अपने अपेक्षित रोल पाथ पर नहीं है
    // यह ग्राहक के लिए सबसे अधिक लागू होता है जो किसी सार्वजनिक लेकिन गैर-होम पेज पर है
    if (isAuthenticated && !isLoadingAuth) {
        // यदि यूजर लॉग इन है और किसी स्पेसिफिक रोल पाथ पर नहीं है, और वह पब्लिक नहीं है
        // यह सुनिश्चित करने के लिए कि कोई यूजर बिना किसी स्पष्ट कारण के कहीं और न जाए
        if (
            !isCurrentPathPublic && 
            !location.startsWith(intendedRolePath || "") && // यदि intendedRolePath परिभाषित है
            (user?.role === "customer" || !user?.role) // ग्राहक या अज्ञात भूमिका के लिए
        ) {
            console.log("AuthRedirectGuard: Logged in customer/unknown role on unhandled path, redirecting to /.");
            navigate("/");
            return;
        }
    }


  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]);

  return null; // गार्ड कुछ भी रेंडर नहीं करता है, केवल रीडायरेक्ट करता है
}
