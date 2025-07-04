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

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const intent = getIntentFromLocation(location);
  const { user, isLoadingAuth, isAuthenticated } = useAuth(); // isAuthenticated भी प्राप्त करें

  useEffect(() => {
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("isAuthenticated:", isAuthenticated); // नया लॉग
    console.log("Current user:", user);
    console.log("Current location:", location);

    // ✅ Step 1: प्रमाणीकरण लोड होने तक प्रतीक्षा करें
    if (isLoadingAuth) {
      console.log("AuthRedirectGuard: Still loading auth, returning.");
      return;
    }

    // ✅ सार्वजनिक पथों की सूची, जिसमें Firebase auth handler भी शामिल है
    const publicPaths = [
      "/",
      "/product",
      "/cart",
      "/checkout",
      "/auth", // Auth page is public for login
      "/login", // If you have a separate login page
      "/admin-login", // If you have an admin login page
      // Firebase auth handler path (important for redirect login flow)
      "__/auth/handler", // Firebase redirect handler
    ];

    const isPublicPath = publicPaths.some((path) => location.includes(path)); // `.includes` for handler subpath

    // 🔒 स्टेप 2: यूज़र लॉगिन नहीं है
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in, checking redirect.");
      // यदि वर्तमान पथ सार्वजनिक नहीं है और Firebase auth handler नहीं है, तो /auth पर रीडायरेक्ट करें
      if (!isPublicPath && !location.includes("__/auth/handler")) {
        console.log("AuthRedirectGuard: Not on public/auth/handler path, redirecting to /auth.");
        navigate("/auth");
      }
      // यदि यह /auth पर है या public/handler पर है, तो उसे वहीं रहने दें
      return;
    }

    // 🔓 स्टेप 3: यूज़र लॉगिन है (`isAuthenticated` अब true है)
    console.log(
      "AuthRedirectGuard: User is logged in. Current role:",
      user?.role
    );

    // यदि यूजर लॉगिन पेज पर है लेकिन पहले से ही लॉग इन है, तो उसे उसके रोल के आधार पर रीडायरेक्ट करें
    if (
      location.startsWith("/auth") ||
      location.startsWith("/login") ||
      location.startsWith("/admin-login")
    ) {
      console.log(
        "AuthRedirectGuard: User is logged in and on a login/auth page, redirecting based on role."
      );
      // अब भूमिका के आधार पर नेविगेट करें
      if (user?.role === "seller") {
        const approvalStatus = user.seller?.approvalStatus;
        if (approvalStatus === "approved") {
          navigate("/seller-dashboard");
        } else if (approvalStatus === "pending") {
          navigate("/seller-status");
        } else {
          navigate("/seller-apply"); // यदि अभी तक आवेदन नहीं किया है
        }
      } else if (user?.role === "admin") {
        navigate("/admin-dashboard");
      } else if (user?.role === "delivery") {
        navigate("/delivery-dashboard");
      } else {
        navigate("/"); // डिफ़ॉल्ट रूप से ग्राहक होम पर
      }
      return; // रीडायरेक्ट के बाद बाहर निकलें
    }

    // स्टेप 4: रोल-आधारित रीडायरेक्ट (लॉगिन पेज पर नहीं होने पर)
    if (!user?.role) {
      console.log(
        "AuthRedirectGuard: User logged in, but role is missing. Defaulting to customer dashboard."
      );
      if (!location.startsWith("/")) navigate("/"); // यदि होम पर नहीं है तो होम पर भेजें
      return;
    }

    console.log(
      "AuthRedirectGuard: User logged in, checking role-based redirect for role:",
      user.role
    );

    switch (user.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus;
        let targetPath = "/seller-apply"; // default for new sellers

        if (approvalStatus === "approved") {
          targetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          targetPath = "/seller-status";
        }

        // यदि वर्तमान स्थान पहले से ही लक्ष्य पथ है, तो कुछ न करें
        if (location.startsWith(targetPath)) {
          console.log("AuthRedirectGuard: Seller already on target path. No redirect.");
          return;
        }

        // यदि विक्रेता /seller-apply पर है और उसका आवेदन अनुमोदित/लंबित है, तो उसे उपयुक्त पेज पर रीडायरेक्ट करें
        if (location.startsWith("/seller-apply") && (approvalStatus === "approved" || approvalStatus === "pending")) {
          console.log(`AuthRedirectGuard: Seller on /seller-apply with status ${approvalStatus}, redirecting to ${targetPath}`);
          navigate(targetPath);
          return;
        }
        
        // यदि विक्रेता किसी विक्रेता-विशिष्ट पथ पर नहीं है, तो उसे लक्ष्य पथ पर रीडायरेक्ट करें
        // (उदाहरण: यदि वह होम पर है, तो डैशबोर्ड पर भेजें)
        if (!location.startsWith("/seller-") && !location.startsWith("/seller-apply")) {
            console.log(`AuthRedirectGuard: Seller on non-seller path, redirecting to ${targetPath}`);
            navigate(targetPath);
            return;
        }
        break; // स्विच से बाहर निकलें, कोई और कार्रवाई नहीं
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
        // ✅ ग्राहक को /seller-apply पर जाने दें यदि intent "become-seller" है
        if (intent === "become-seller" && location.startsWith("/seller-apply")) {
          console.log("AuthRedirectGuard: Customer wants to become seller, allowing access to /seller-apply");
          return; // उन्हें यहीं रहने दें
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

        // यदि ग्राहक किसी सार्वजनिक पथ पर है, तो उसे वहीं रहने दें (होम को छोड़कर अनावश्यक रीडायरेक्ट न करें)
        if (isPublicPath && location !== "/") {
            console.log("AuthRedirectGuard: Customer on public path. No redirect.");
            return;
        }

        // यदि ग्राहक होम पर नहीं है और कोई अन्य विशेष पथ नहीं है, तो होम पर रीडायरेक्ट करें
        if (location !== "/") {
          console.log("AuthRedirectGuard: Customer not on home, redirecting to /.");
          navigate("/");
        }
        return;
    }
  }, [user, isLoadingAuth, isAuthenticated, location, navigate, intent]); // isAuthenticated को dependencies में जोड़ें

  return null; // गार्ड कुछ भी रेंडर नहीं करता है, केवल रीडायरेक्ट करता है
}
