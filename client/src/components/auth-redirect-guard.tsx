// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

// सार्वजनिक पथों की सूची
const PUBLIC_PATHS = [
  "/",
  "/product/", 
  "/cart",
  "/checkout",
];

// लॉगिन/Firebase handler जैसे स्पेशल ऑथ पाथ
const AUTH_SPECIFIC_PATHS = [
  "/auth",
  "/login", 
  "/admin-login", 
  "/__/auth/handler",
];

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const intent = localStorage.getItem('redirectIntent'); 
  const { user, isLoadingAuth, isAuthenticated } = useAuth(); 

  useEffect(() => {
    console.group("AuthRedirectGuard Log");
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("isAuthenticated:", isAuthenticated);
    console.log("Current user (UUID):", user?.uuid || "null");
    console.log("Current location:", location);
    console.log("Intent from localStorage:", intent);

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

    // --- ✅ प्राथमिकता 1: 'become-seller' इंटेंट को हैंडल करें ---
    // यह चेक सबसे पहले और बिना किसी authentication चेक के होना चाहिए।
    if (intent === "become-seller") {
      console.log("AuthRedirectGuard: 'become-seller' intent found in localStorage.");
      
      // यदि यूज़र लॉग-इन है और उसका रोल seller है
      if (isAuthenticated && user?.role === "seller") {
        console.log("AuthRedirectGuard: Authenticated seller with 'become-seller' intent. Determining seller path.");
        localStorage.removeItem('redirectIntent'); // इंटेंट को उपयोग के बाद हटा दें

        const approvalStatus = user?.seller?.approvalStatus;
        let sellerTargetPath: string;

        if (approvalStatus === "approved") {
          sellerTargetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          sellerTargetPath = "/seller-status";
        } else { // seller रोल है लेकिन कोई स्टेटस नहीं या approved/pending नहीं
          sellerTargetPath = "/seller-apply";
        }
        
        // यदि यूज़र पहले से ही सही सेलर पाथ पर नहीं है, तो रीडायरेक्ट करें
        if (location !== sellerTargetPath && !location.startsWith(sellerTargetPath + '/')) {
          console.log(`AuthRedirectGuard: Redirecting authenticated seller to seller flow: ${sellerTargetPath}`);
          navigate(sellerTargetPath);
          console.groupEnd();
          return;
        }
        console.log("AuthRedirectGuard: Authenticated seller already on correct seller intent path. Staying put.");
        console.groupEnd(); 
        return;

      } else {
        // यदि यूज़र लॉग-आउट है, या लॉग-इन है लेकिन उसका रोल 'seller' नहीं है,
        // तो उसे /auth पर भेजें ताकि वह लॉगिन/साइन-अप कर सके और seller बन सके।
        console.log("AuthRedirectGuard: Not a seller or not authenticated, but 'become-seller' intent found. Redirecting to /auth.");
        if (location !== "/auth") { 
            navigate("/auth");
        }
        console.groupEnd();
        return;
      }
    }

    // --- अब सामान्य ऑथेंटिकेशन और रीडायरेक्ट लॉजिक (केवल जब कोई 'become-seller' इंटेंट न हो) ---

    // --- 🔒 यूज़र लॉगिन नहीं है ---
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in (no 'become-seller' intent).");
      
      // यदि यूजर किसी auth-विशिष्ट पाथ पर है (जैसे /auth, /login, /admin-login)
      if (isOnAuthSpecificPath) {
        console.log("AuthRedirectGuard: Not logged in user on auth-specific path. Staying put.");
        console.groupEnd();
        return; 
      }

      // यदि यूजर किसी सार्वजनिक पाथ पर है (जैसे /, /product, /cart)
      if (isOnPublicPath) {
        console.log("AuthRedirectGuard: Not logged in user on public path. Staying put.");
        console.groupEnd();
        return; 
      }

      // यदि यूजर लॉगिन नहीं है और न ही किसी auth-विशिष्ट या सार्वजनिक पाथ पर है
      console.log("AuthRedirectGuard: Not logged in user on restricted non-public path. Redirecting to /auth.");
      navigate("/auth");
      console.groupEnd();
      return;
    }

    // --- 🔓 यूज़र लॉगिन है (`isAuthenticated` अब true है और कोई 'become-seller' इंटेंट नहीं था) ---
    console.log(
      "AuthRedirectGuard: User is logged in (no 'become-seller' intent). Current role:",
      user?.role,
      "Approval Status:",
      user?.seller?.approvalStatus
    );

    // ✅ प्राथमिकता 2: यदि यूजर लॉगिन है और 'auth-specific' पेज पर है, तो होम पर भेजें
    if (isOnAuthSpecificPath) {
      console.log("AuthRedirectGuard: Logged in user on auth-specific page (no intent). Redirecting to /.");
      navigate("/");
      console.groupEnd();
      return;
    }

    // --- रोल-आधारित रीडायरेक्ट लॉजिक (केवल जब यूजर लॉग इन हो और auth/public पाथ पर न हो और कोई इंटेंट न हो) ---
    let targetPath: string | null = null; 

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
        if (!location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
          navigate(targetPath);
          console.groupEnd();
          return;
        }
        break;

      case "delivery":
        targetPath = "/delivery-dashboard";
        if (!location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
          navigate(targetPath);
          console.groupEnd();
          return;
        }
        break;

      case "customer":
      default: 
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
        break; 
    }

    console.log("AuthRedirectGuard: Logged in user on appropriate path, staying put.");
    console.groupEnd();

  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]); 

  return null; 
}
