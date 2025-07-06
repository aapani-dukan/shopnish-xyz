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
// इन रास्तों पर बिना लॉगिन के भी जाया जा सकता है
const PUBLIC_PATHS = [
  "/",
  "/product/", // /product/id को मैच करने के लिए स्लैश जोड़ा गया
  "/cart",
  "/checkout",
  // "/admin-login", // AdminLogin को auth-specific में ले जा रहे हैं ताकि लॉग-इन पर यह होम पर रीडायरेक्ट न करे
];

// लॉगिन/Firebase handler जैसे स्पेशल ऑथ पाथ
const AUTH_SPECIFIC_PATHS = [
  "/auth",
  "/login", // अगर आप इसे auth से अलग रखते हैं
  "/admin-login", // AdminLogin भी अब auth-specific है
  "/__/auth/handler",
];

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const intent = getIntentFromLocation(location); // URL से इंटेंट निकालें
  const { user, isLoadingAuth, isAuthenticated } = useAuth(); // useAuth से सीधे isAuthenticated मिल रहा है

  useEffect(() => {
    console.group("AuthRedirectGuard Log");
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("isAuthenticated:", isAuthenticated);
    console.log("Current user (UUID):", user?.uuid || "null");
    console.log("Current location:", location);
    console.log("Intent:", intent);

    // Step 1: प्रमाणीकरण लोड होने तक प्रतीक्षा करें
    if (isLoadingAuth) {
      console.log("AuthRedirectGuard: Still loading auth, returning.");
      console.groupEnd();
      return;
    }

    // कुछ उपयोगी फ्लैग्स
    const isOnPublicPath = PUBLIC_PATHS.some(
      (path) => location === path || (path.endsWith("/") && location.startsWith(path)) || (!path.endsWith("/") && location.startsWith(path + '/'))
    );
    const isOnAuthSpecificPath = AUTH_SPECIFIC_PATHS.some(
      (path) => location === path || location.startsWith(path + '/') || location.includes(path)
    );
    const isHome = location === "/";

    // --- 🔒 यूज़र लॉगिन नहीं है ---
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in.");

      // यदि 'become-seller' इंटेंट है लेकिन यूजर लॉग इन नहीं है, तो उसे लॉगिन पेज पर भेजें
      if (intent === "become-seller") {
        console.log("AuthRedirectGuard: Not logged in, but 'become-seller' intent. Redirecting to /auth (login).");
        navigate("/auth?intent=become-seller"); // इंटेंट को बनाए रखें
        console.groupEnd();
        return;
      }
      
      // यदि यूजर किसी auth-विशिष्ट पाथ पर है (जैसे /auth, /login, /admin-login)
      if (isOnAuthSpecificPath) {
        console.log("AuthRedirectGuard: Not logged in user on auth-specific path. Staying put.");
        console.groupEnd();
        return; // उसे वहां रहने दें ताकि वह लॉगिन कर सके
      }

      // यदि यूजर किसी सार्वजनिक पाथ पर है (जैसे /, /product, /cart)
      if (isOnPublicPath) {
        console.log("AuthRedirectGuard: Not logged in user on public path. Staying put.");
        console.groupEnd();
        return; // उसे वहां रहने दें
      }

      // यदि यूजर लॉगिन नहीं है और न ही किसी auth-विशिष्ट या सार्वजनिक पाथ पर है
      // तो उसे /auth पर रीडायरेक्ट करें (संरक्षित पाथ तक पहुंचने की कोशिश)
      console.log("AuthRedirectGuard: Not logged in user on restricted non-public path. Redirecting to /auth.");
      navigate("/auth");
      console.groupEnd();
      return;
    }

    // --- 🔓 यूज़र लॉगिन है (`isAuthenticated` अब true है) ---
    console.log(
      "AuthRedirectGuard: User is logged in. Current role:",
      user?.role,
      "Approval Status:",
      user?.seller?.approvalStatus
    );

    // ✅ प्राथमिकता 1: 'become-seller' इंटेंट को हैंडल करें
    if (intent === "become-seller") {
      console.log("AuthRedirectGuard: Logged in user with 'become-seller' intent.");
      // यहां यूजर की वर्तमान विक्रेता स्थिति के आधार पर निर्णय लें
      const approvalStatus = user?.seller?.approvalStatus;
      let sellerTargetPath = "/seller-apply"; // डिफ़ॉल्ट

      if (user?.role === "seller") {
        if (approvalStatus === "approved") {
          sellerTargetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          sellerTargetPath = "/seller-status";
        }
      }
      
      // यदि यूजर पहले से ही सही पेज पर नहीं है तो ही रीडायरेक्ट करें
      if (location !== sellerTargetPath && !location.startsWith(sellerTargetPath + '/')) {
        console.log(`AuthRedirectGuard: Redirecting to seller flow: ${sellerTargetPath}`);
        navigate(sellerTargetPath);
        console.groupEnd();
        return;
      }
      // यदि वह पहले से ही सही जगह पर है, तो कुछ न करें और फ्लो जारी रखें (जो कि अच्छी बात है)
      console.log("AuthRedirectGuard: User already on correct seller intent path. Staying put.");
      console.groupEnd(); // इंटेंट हैंडल हो गया, यहां से बाहर
      return;
    }

    // ✅ प्राथमिकता 2: यदि यूजर लॉगिन है और 'auth-specific' पेज पर है (लेकिन कोई इंटेंट नहीं था), तो होम पर भेजें
    // यह सुनिश्चित करता है कि Google लॉगिन के बाद /__/auth/handler या /auth पर न फंसे अगर 'become-seller' इंटेंट नहीं था।
    if (isOnAuthSpecificPath) {
      console.log("AuthRedirectGuard: Logged in user on auth-specific page (no intent). Redirecting to /.");
      navigate("/");
      console.groupEnd();
      return;
    }

    // --- रोल-आधारित रीडायरेक्ट लॉजिक (केवल जब यूजर लॉग इन हो और auth/public पाथ पर न हो) ---
    let targetPath: string | null = null; // यह वह पाथ है जहां यूजर को जाना चाहिए

    switch (user?.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus;
        if (approvalStatus === "approved") {
          targetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          targetPath = "/seller-status";
        } else {
          targetPath = "/seller-apply";
        }

        // यदि यूजर seller-specific पाथ पर नहीं है और उसके लिए एक targetPath है, तो रीडायरेक्ट करें
        if (!location.startsWith("/seller-") && targetPath && location !== targetPath && !location.startsWith(targetPath + '/')) {
          console.log(`AuthRedirectGuard: Seller on non-seller path, redirecting to ${targetPath}`);
          navigate(targetPath);
          console.groupEnd();
          return;
        }
        break;
      }

      case "admin":
        targetPath = "/admin-dashboard";
        // यदि एडमिन किसी एडमिन-डैशबोर्ड पाथ पर नहीं है
        if (!location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
          navigate(targetPath);
          console.groupEnd();
          return;
        }
        break;

      case "delivery":
        targetPath = "/delivery-dashboard";
        // यदि डिलीवरी किसी डिलीवरी-डैशबोर्ड पाथ पर नहीं है
        if (!location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
          navigate(targetPath);
          console.groupEnd();
          return;
        }
        break;

      case "customer":
      default: // डिफ़ॉल्ट रूप से ग्राहक (या अज्ञात भूमिका)
        // यदि ग्राहक किसी संरक्षित विक्रेता/एडमिन/डिलीवरी पेज पर है, तो होम पर रीडायरेक्ट करें
        if (
          location.startsWith("/seller-") ||
          location.startsWith("/admin-") ||
          location.startsWith("/delivery-")
        ) {
          console.log("AuthRedirectGuard: Customer or unknown role on restricted page, redirecting to /.");
          navigate("/");
          console.groupEnd();
          return;
        }
        break; // कोई अन्य रीडायरेक्ट नहीं, उसे पब्लिक या जहां है वहीं रहने दें
    }

    console.log("AuthRedirectGuard: Logged in user on appropriate path, staying put.");
    console.groupEnd();

  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]);

  return null; // गार्ड कुछ भी रेंडर नहीं करता है, केवल रीडायरेक्ट करता है
}



