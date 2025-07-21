// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

// Helper function for more robust path matching
const isPathMatch = (currentPath: string, targetPath: string): boolean => {
  // Exact match
  if (currentPath === targetPath) {
    return true;
  }
  // If targetPath ends with '/', check if currentPath starts with it
  // e.g., /product/ should match /product/123, /product/category
  if (targetPath.endsWith('/')) {
    return currentPath.startsWith(targetPath);
  }
  // If targetPath doesn't end with '/', check if currentPath is an exact match
  // or starts with targetPath followed by a '/' (e.g., /auth/login)
  return currentPath.startsWith(targetPath + '/') || currentPath === targetPath;
};


const PUBLIC_PATHS = ["/", "/product", "/cart", "/checkout"]; // '/product/' से '/product' किया ताकि isPathMatch सही से काम करे
const AUTH_SPECIFIC_PATHS = ["/auth", "/login", "/admin-login"];

export function AuthRedirectGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const intent = localStorage.getItem("redirectIntent");
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    console.group("🔐 AuthRedirectGuard Triggered");
    console.log("📍 Current Path:", location.pathname);
    console.log("⏳ Is Auth Loading?:", isLoadingAuth);
    console.log("✅ Is Authenticated?:", isAuthenticated);
    console.log("👤 User UID:", user?.uid || "null");
    console.log("🎯 Redirect Intent:", intent);

    const currentPath = location.pathname;

    const isOnPublicPath = PUBLIC_PATHS.some((path) => isPathMatch(currentPath, path));
    const isOnAuthSpecificPath = AUTH_SPECIFIC_PATHS.some((path) => isPathMatch(currentPath, path));

    if (isLoadingAuth) {
      console.log("⏳ Auth data still loading. Waiting...");
      console.groupEnd();
      return;
    }

    // ------------------------------------------
    // 📌 Priority 1: Handle redirectIntent = "become-seller"
    // ------------------------------------------
    if (intent === "become-seller") {
      console.log("➡️ 'become-seller' intent detected.");
      if (!isAuthenticated) {
        console.log("🔁 Not authenticated for seller intent. Redirecting to /auth for login.");
        navigate("/auth", { replace: true });
        console.groupEnd();
        return;
      }

      let sellerTargetPath = "/seller-apply";
      const approval = user?.seller?.approvalStatus;

      if (user?.role === "seller") {
        if (approval === "approved") {
          sellerTargetPath = "/seller-dashboard";
        } else if (approval === "pending") {
          sellerTargetPath = "/seller-status";
        }
      }

      // Check if current path is NOT the intended seller path
      if (!isPathMatch(currentPath, sellerTargetPath)) {
        console.log(`➡️ Logged in for seller intent. Redirecting to designated seller path: ${sellerTargetPath}`);
        localStorage.removeItem("redirectIntent"); // Intent used, remove it
        navigate(sellerTargetPath, { replace: true });
        console.groupEnd();
        return;
      }

      console.log("✅ Already on correct seller intent page. Staying put.");
      localStorage.removeItem("redirectIntent"); // Intent used, remove it
      console.groupEnd();
      return;
    }

    // ------------------------------------------
    // 🔒 User is NOT logged in
    // ------------------------------------------
    if (!isAuthenticated) {
      console.log("👤 User is NOT logged in.");
      if (isOnAuthSpecificPath || isOnPublicPath) {
        console.log("✅ On a public or auth-specific path. No redirect needed.");
        console.groupEnd();
        return;
      }
      // If not logged in and not on a public/auth-specific path, redirect to auth
      console.log("🚫 On a restricted path (not logged in). Redirecting to /auth.");
      navigate("/auth", { replace: true });
      console.groupEnd();
      return;
    }

    // ------------------------------------------
    // 🔓 User IS logged in (isAuthenticated is true now)
    // ------------------------------------------
    console.log("🔓 User IS logged in.");

    // If logged in user tries to access auth-specific pages, redirect to home
    if (isOnAuthSpecificPath) {
      console.log("✅ Logged-in user on auth-specific page. Redirecting to /.");
      navigate("/", { replace: true });
      console.groupEnd();
      return;
    }

    let targetPath: string | null = null;

    switch (user?.role) {
      case "seller": {
        const approval = user.seller?.approvalStatus;
        if (approval === "approved") {
          targetPath = "/seller-dashboard";
        } else if (approval === "pending") {
          targetPath = "/seller-status";
        } else {
          targetPath = "/seller-apply";
        }

        // Check if current path is NOT the intended seller path
        if (!isPathMatch(currentPath, targetPath) && !currentPath.startsWith("/seller-")) { // Keep broad /seller- check for sub-routes
          console.log(`🔀 Seller on non-seller path. Redirecting to ${targetPath}.`);
          navigate(targetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;
      }

      case "admin":
        targetPath = "/admin-dashboard";
        if (!isPathMatch(currentPath, targetPath) && !currentPath.startsWith("/admin-")) {
          console.log("🔀 Admin on non-admin path. Redirecting to /admin-dashboard.");
          navigate(targetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;

      case "delivery":
        targetPath = "/delivery-dashboard";
        if (!isPathMatch(currentPath, targetPath) && !currentPath.startsWith("/delivery-")) {
          console.log("🔀 Delivery on non-delivery path. Redirecting to /delivery-dashboard.");
          navigate(targetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;

      case "customer":
      default:
        // If customer or unknown role is on a restricted admin/seller/delivery page, redirect to home
        if (
          currentPath.startsWith("/seller-") ||
          currentPath.startsWith("/admin-") ||
          currentPath.startsWith("/delivery-")
        ) {
          console.log("❌ Customer or unknown role on restricted page. Redirecting to /.");
          navigate("/", { replace: true });
          console.groupEnd();
          return;
        }
    }

    console.log("✅ All clear. User on appropriate path. Staying put.");
    console.groupEnd();
  }, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate, intent]);

  return null;
}
