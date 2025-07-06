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
  "/admin-login", // admin-login को भी पब्लिक माना जा सकता है ताकि कोई भी उस पेज पर जा सके
];

// लॉगिन/Firebase handler जैसे स्पेशल ऑथ पाथ
const AUTH_SPECIFIC_PATHS = [
  "/auth",
  "/login", // अगर आप इसे auth से अलग रखते हैं
  "/__/auth/handler",
];

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const intent = getIntentFromLocation(location);
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

    // --- 🔓 यूज़र लॉगिन है (`isAuthenticated` अब true है) ---
    if (isAuthenticated) {
      console.log("AuthRedirectGuard: User is logged in. Current role:", user?.role, "Approval Status:", user?.seller?.approvalStatus);

      // ✅ यदि यूजर लॉगिन/auth पेज पर है लेकिन पहले से ही लॉग इन है, तो उसे होम पेज पर भेजें
      // यह सुनिश्चित करता है कि लॉग-इन होने पर यूजर /auth या /login पर न फंसे।
      if (isOnAuthSpecificPath) {
        console.log("AuthRedirectGuard: Logged in user on auth-specific page, redirecting to /.");
        navigate("/"); 
        console.groupEnd();
        return;
      }

      // --- रोल-आधारित रीडायरेक्ट लॉजिक (केवल जब यूजर लॉग इन हो और auth/public पाथ पर न हो) ---
      let targetPath: string | null = null; // यह वह पाथ है जहां यूजर को जाना चाहिए

      switch (user?.role) { // user? ताकि undefined/null पर एरर न आए
        case "seller": {
          const approvalStatus = user.seller?.approvalStatus;

          if (approvalStatus === "approved") {
            targetPath = "/seller-dashboard";
          } else if (approvalStatus === "pending") {
            targetPath = "/seller-status";
          } else { // rejected या कोई और स्थिति
            targetPath = "/seller-apply";
          }

          if (intent === "become-seller" || !location.startsWith("/seller-")) {
            // यदि इंटेंट है या यूजर विक्रेता-विशिष्ट पाथ पर नहीं है
            if (location !== targetPath && !location.startsWith(targetPath + '/')) { // सिर्फ तभी रीडायरेक्ट करें जब पहले से सही जगह पर न हों
                console.log(`AuthRedirectGuard: Seller user (status: ${approvalStatus}) with intent/on wrong path. Redirecting to ${targetPath}`);
                navigate(targetPath);
                console.groupEnd();
                return;
            }
          }
          break;
        }

        case "admin":
          targetPath = "/admin-dashboard";
          if (intent === "become-seller") { 
            console.log("AuthRedirectGuard: Admin user with 'become-seller' intent, redirecting to /seller-apply.");
            navigate("/seller-apply");
            console.groupEnd();
            return;
          }
          if (!location.startsWith(targetPath)) {
            console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
            navigate(targetPath);
            console.groupEnd();
            return;
          }
          break;

        case "delivery":
          targetPath = "/delivery-dashboard";
          if (intent === "become-seller") { 
            console.log("AuthRedirectGuard: Delivery user with 'become-seller' intent, redirecting to /seller-apply.");
            navigate("/seller-apply");
            console.groupEnd();
            return;
          }
          if (!location.startsWith(targetPath)) {
            console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
            navigate(targetPath);
            console.groupEnd();
            return;
          }
          break;

        case "customer":
        default: // डिफ़ॉल्ट रूप से ग्राहक (या अज्ञात भूमिका)
          if (intent === "become-seller") {
            console.log("AuthRedirectGuard: Customer with 'become-seller' intent, redirecting to /seller-apply.");
            navigate("/seller-apply");
            console.groupEnd();
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
            console.groupEnd();
            return;
          }
          break; // कोई अन्य रीडायरेक्ट नहीं, उसे पब्लिक या जहां है वहीं रहने दें
      }

      console.log("AuthRedirectGuard: Logged in user on appropriate path, staying put.");
      console.groupEnd();
      return; // यदि कोई विशेष रीडायरेक्ट नहीं हुआ, तो वर्तमान स्थान पर रहें
    }

    // --- 🔒 यूज़र लॉगिन नहीं है ---
    console.log("AuthRedirectGuard: User not logged in.");

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
    
  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]);

  return null; // गार्ड कुछ भी रेंडर नहीं करता है, केवल रीडायरेक्ट करता है
}
