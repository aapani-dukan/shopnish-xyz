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
// ✅ इन रास्तों पर बिना लॉगिन के भी जाया जा सकता है
const PUBLIC_PATHS = [
  "/",
  "/product",
  "/cart",
  "/checkout",
];

// ✅ लॉगिन/एडमिन-लॉगिन/Firebase handler जैसे स्पेशल ऑथ पाथ
const AUTH_SPECIFIC_PATHS = [
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

    // ✅ कुछ उपयोगी फ्लैग्स
    const isOnPublicPath = PUBLIC_PATHS.some(
      (path) => location === path || (path.endsWith("/") && location.startsWith(path))
    );
    const isOnAuthSpecificPath = AUTH_SPECIFIC_PATHS.some(
      (path) => location === path || location.startsWith(path) || location.includes(path)
    );
    const isHome = location === "/";


    // --- 🔒 यूज़र लॉगिन नहीं है ---
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in.");

      // यदि यूजर /auth या किसी ऑथ-स्पेसिफिक पाथ पर नहीं है
      // और वह किसी सार्वजनिक पथ पर भी नहीं है, तो उसे /auth पर रीडायरेक्ट करें।
      // यह सुनिश्चित करता है कि संरक्षित मार्ग तक पहुंचने की कोशिश करने वाले को /auth पर भेजा जाए।
      if (!isOnAuthSpecificPath && !isOnPublicPath) {
        console.log("AuthRedirectGuard: Not on auth/public path, redirecting to /auth.");
        navigate("/auth");
        return;
      }
      
      // ✅ ऐप खोलने पर: यदि यूजर होम पेज पर है और लॉग इन नहीं है, तो उसे /auth पर रीडायरेक्ट करें
      // (यह आपके पहले नियम का पालन करता है कि ऐप खुलते ही अनधिकृत यूजर लॉगिन पेज पर जाए)
      if (isHome && !isOnAuthSpecificPath) { // यदि वे होम पर हैं और /auth पर नहीं हैं
        console.log("AuthRedirectGuard: User not logged in and on home page, redirecting to /auth.");
        navigate("/auth");
        return;
      }

      console.log("AuthRedirectGuard: On a public/auth-specific path, staying put.");
      return; // सार्वजनिक या auth-विशिष्ट पथों पर रहने दें
    }

    // --- 🔓 यूज़र लॉगिन है (`isAuthenticated` अब true है) ---
    console.log(
      "AuthRedirectGuard: User is logged in. Current role:",
      user?.role,
      "Approval Status:",
      user?.seller?.approvalStatus
    );

    // ✅ ऐप खुलने पर/लॉगिन के बाद: यदि यूजर लॉगिन/auth पेज पर है लेकिन पहले से ही लॉग इन है
    // तो उसे होम पेज पर भेजें (आपके नियम 1 का पालन करते हुए: लॉगिन के बाद होम पेज)
    if (isOnAuthSpecificPath) {
      console.log("AuthRedirectGuard: Logged in user on auth-specific page, redirecting to /.");
      navigate("/"); // लॉगिन के बाद हमेशा होम पर भेजें जैसा आपने बताया
      return;
    }

    // --- रोल-आधारित रीडायरेक्ट लॉजिक ---
    if (!user?.role) {
      console.warn("AuthRedirectGuard: User logged in but role is missing. Defaulting to home.");
      if (location !== "/") {
        navigate("/");
      }
      return;
    }

    let targetPath: string | null = null; // यह वह पाथ है जहां यूजर को जाना चाहिए

    switch (user.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus;

        // नियम: 1.seller-approved to seller dashboard
        if (approvalStatus === "approved") {
          targetPath = "/seller-dashboard";
        } 
        // नियम: 2. Seller - pending to please wait
        else if (approvalStatus === "pending") {
          targetPath = "/seller-status";
        } 
        // नियम: 3. इनके अलावा कोई भी रोल/स्टेटस हो तो seller apply form
        else {
          targetPath = "/seller-apply";
        }

        // यदि यूजर का इरादा "become-seller" है (बटन दबाने के बाद)
        if (intent === "become-seller") {
            console.log(`AuthRedirectGuard: Seller user (status: ${approvalStatus}) with 'become-seller' intent. Redirecting to ${targetPath}`);
            navigate(targetPath);
            return;
        }

        // यदि वर्तमान स्थान पहले से ही अपेक्षित पाथ पर है, तो रीडायरेक्ट न करें
        if (location.startsWith(targetPath)) {
            console.log(`AuthRedirectGuard: Seller already on correct path (${location}). No redirect.`);
            return;
        }
        
        // यदि विक्रेता किसी गैर-विक्रेता संरक्षित पथ पर है, तो उसे उसके अपेक्षित पथ पर भेजें
        if (
          !location.startsWith("/seller-") && // यदि वह विक्रेता-विशिष्ट पथ पर नहीं है
          !location.startsWith("/admin-") && // और एडमिन पाथ पर नहीं है
          !location.startsWith("/delivery-") && // और डिलीवरी पाथ पर नहीं है
          !isOnPublicPath // और सार्वजनिक पाथ पर भी नहीं है
        ) {
          console.log(`AuthRedirectGuard: Seller on non-seller/protected path, redirecting to ${targetPath}`);
          navigate(targetPath);
          return;
        }
        break; // स्विच से बाहर निकलें
      }

      case "admin":
        targetPath = "/admin-dashboard";
        if (intent === "become-seller") { // एडमिन भी seller बन सकता है
            console.log("AuthRedirectGuard: Admin user with 'become-seller' intent, redirecting to /seller-apply.");
            navigate("/seller-apply");
            return;
        }
        if (!location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
          navigate(targetPath);
          return;
        }
        break;

      case "delivery":
        targetPath = "/delivery-dashboard";
        if (intent === "become-seller") { // डिलीवरी भी seller बन सकता है
            console.log("AuthRedirectGuard: Delivery user with 'become-seller' intent, redirecting to /seller-apply.");
            navigate("/seller-apply");
            return;
        }
        if (!location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
          navigate(targetPath);
          return;
        }
        break;

      case "customer":
      default: // डिफ़ॉल्ट रूप से ग्राहक (या अज्ञात भूमिका)
        // यदि ग्राहक "become-seller" इंटेंट के साथ है, तो /seller-apply पर भेजें
        if (intent === "become-seller") {
          console.log("AuthRedirectGuard: Customer with 'become-seller' intent, redirecting to /seller-apply.");
          navigate("/seller-apply");
          return;
        }

        // यदि ग्राहक किसी संरक्षित विक्रेता/एडमिन/डिलीवरी पेज पर है, तो होम पर रीडायरेक्ट करें
        if (
          location.startsWith("/seller-") ||
          location.startsWith("/admin-") ||
          location.startsWith("/delivery-")
        ) {
          console.log("AuthRedirectGuard: Customer or unknown role on restricted page, redirecting to /.");
          navigate("/");
          return;
        }

        // यदि ग्राहक होम पर है, तो उसे वहीं रहने दें (आपका नियम)
        if (isHome) {
            console.log("AuthRedirectGuard: Customer on home page. Staying put.");
            return;
        }
        
        // यदि ग्राहक किसी सार्वजनिक (लेकिन होम नहीं) पथ पर है, तो उसे वहीं रहने दें
        if (isOnPublicPath && !isHome) {
            console.log("AuthRedirectGuard: Customer on public path (not home). Staying put.");
            return;
        }

        // अंतिम कैच-ऑल: यदि ग्राहक किसी अनहैंडल्ड या गैर-सार्वजनिक पथ पर है, तो होम पर भेजें
        if (!isOnPublicPath) { // अगर पब्लिक नहीं है तो होम पर भेज दो
          console.log("AuthRedirectGuard: Customer not on public path, redirecting to /.");
          navigate("/");
          return;
        }
        break;
    }

    // ✅ अंतिम कैच-ऑल: यदि यूजर लॉग इन है और कोई विशेष रीडायरेक्ट लागू नहीं होता है,
    // तो सुनिश्चित करें कि वे होम पेज पर हैं यदि वे पहले से ही किसी वैध स्थान पर नहीं हैं
    // (यह मुख्य रूप से ग्राहक के लिए है जो किसी अनपेक्षित गैर-सार्वजनिक पथ पर हो सकता है)
    if (isAuthenticated && !isLoadingAuth && user?.role === "customer") {
        if (!isOnPublicPath && !isHome && !isOnAuthSpecificPath) { // सुनिश्चित करें कि यह किसी भी वैध पथ पर नहीं है
            console.log("AuthRedirectGuard: Logged in customer on unhandled non-public path, redirecting to /.");
            navigate("/");
            return;
        }
    }


  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]);

  return null; // गार्ड कुछ भी रेंडर नहीं करता है, केवल रीडायरेक्ट करता है
}
