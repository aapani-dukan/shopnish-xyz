// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// सार्वजनिक पथों की सूची
const PUBLIC_PATHS = [
  "/",
  "/product/",
  "/cart",
  "/checkout",
  "/auth",
];

// रोल-विशिष्ट डैशबोर्ड पथ (रीडायरेक्ट लक्ष्य)
const ROLE_DASHBOARD_PATHS = {
  seller: "/seller-dashboard",
  admin: "/admin-dashboard",
  delivery: "/delivery-dashboard",
  customer: "/",
};

// विक्रेता-संबंधित विशेष पथ
const SELLER_SPECIFIC_PATHS = {
  apply: "/seller-apply",
  status: "/seller-status",
  dashboard: "/seller-dashboard",
};

export function AuthRedirectGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const intent = localStorage.getItem('redirectIntent');

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
    
    // ✅ user.sellerProfile?.approvalStatus का उपयोग करें
    console.log("User seller approval status from AuthContext:", user?.sellerProfile?.approvalStatus);

    // Step 1: प्रमाणीकरण लोड होने तक प्रतीक्षा करें
    if (isLoadingAuth) {
      console.log("AuthRedirectGuard: Still loading auth, returning.");
      console.groupEnd();
      return;
    }

    const currentPath = location.pathname;
    const isOnPublicPath = PUBLIC_PATHS.some(
      (path) => currentPath === path || (path.endsWith("/") && currentPath.startsWith(path))
    );

    // --- ✅ प्राथमिकता 1: 'become-seller' इंटेंट को हैंडल करें ---
    if (intent === "become-seller") {
      console.log("AuthRedirectGuard: 'become-seller' intent found.");

      if (!isAuthenticated) {
        console.log("AuthRedirectGuard: Not authenticated with 'become-seller' intent. Redirecting to /auth.");
        navigate("/auth", { replace: true });
        console.groupEnd();
        return;
      }

      if (isAuthenticated) {
        let sellerTargetPath: string;
        // ✅ user.sellerProfile का उपयोग करें
        const approvalStatus = user?.sellerProfile?.approvalStatus;

        if (user?.role === "seller") {
          if (approvalStatus === "approved") {
            sellerTargetPath = SELLER_SPECIFIC_PATHS.dashboard;
          } else if (approvalStatus === "pending") {
            sellerTargetPath = SELLER_SPECIFIC_PATHS.status;
          } else {
            sellerTargetPath = SELLER_SPECIFIC_PATHS.apply;
          }
        } else {
          sellerTargetPath = SELLER_SPECIFIC_PATHS.apply;
        }

        if (currentPath !== sellerTargetPath && !currentPath.startsWith(sellerTargetPath + '/')) {
          console.log(`AuthRedirectGuard: Logged in with 'become-seller' intent, redirecting to designated seller path: ${sellerTargetPath}`);
          localStorage.removeItem('redirectIntent');
          navigate(sellerTargetPath, { replace: true });
          console.groupEnd();
          return;
        }
        console.log("AuthRedirectGuard: User already on correct seller intent path. Staying put.");
        localStorage.removeItem('redirectIntent');
        console.groupEnd();
        return;
      }
    }

    // --- अब सामान्य ऑथेंटिकेशन और रीडायरेक्ट लॉजिक ---
    if (!isAuthenticated) {
      console.log("AuthRedirectGuard: User not logged in.");

      if (isOnPublicPath) {
        console.log("AuthRedirectGuard: Not logged in user on public path. Staying put.");
        console.groupEnd();
        return;
      }

      console.log("AuthRedirectGuard: Not logged in user on restricted non-public path. Redirecting to /auth.");
      navigate("/auth", { replace: true });
      console.groupEnd();
      return;
    }

    console.log(
      "AuthRedirectGuard: User is logged in. Current role:",
      user?.role,
      // ✅ user.sellerProfile?.approvalStatus का उपयोग करें
      "Approval Status:",
      user?.sellerProfile?.approvalStatus
    );

    if (currentPath === "/auth") {
        const targetDashboard = ROLE_DASHBOARD_PATHS[user?.role || 'customer'];
        if (currentPath !== targetDashboard) {
            console.log(`AuthRedirectGuard: Logged in user on auth page. Redirecting to ${targetDashboard}.`);
            navigate(targetDashboard, { replace: true });
            console.groupEnd();
            return;
        }
    }

    let actualTargetPath: string | null = null;
    switch (user?.role) {
      case "seller": {
        // ✅ user.sellerProfile का उपयोग करें
        const approvalStatus = user.sellerProfile?.approvalStatus;
        if (approvalStatus === "approved") {
          actualTargetPath = SELLER_SPECIFIC_PATHS.dashboard;
        } else if (approvalStatus === "pending") {
          actualTargetPath = SELLER_SPECIFIC_PATHS.status;
        } else {
          actualTargetPath = SELLER_SPECIFIC_PATHS.apply;
        }

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
        if (
          currentPath.startsWith("/seller-") ||
          currentPath.startsWith("/admin-") ||
          currentPath.startsWith("/delivery-")
        ) {
          if (currentPath.startsWith(SELLER_SPECIFIC_PATHS.status)) {
            console.log("AuthRedirectGuard: Customer on /seller-status page. Allowing access.");
            console.groupEnd();
            return;
          }
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
