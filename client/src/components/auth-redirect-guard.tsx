// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

const PUBLIC_PATHS = ["/", "/product/", "/cart", "/checkout"];
const AUTH_SPECIFIC_PATHS = ["/auth", "/login", "/admin-login"];

export function AuthRedirectGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const intent = localStorage.getItem("redirectIntent");
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    console.group("🔐 AuthRedirectGuard");
    console.log("📍 Path:", location.pathname);
    console.log("⏳ isLoadingAuth:", isLoadingAuth);
    console.log("✅ isAuthenticated:", isAuthenticated);
    console.log("👤 UID:", user?.uid || "null");
    console.log("🎯 Intent:", intent);

    const currentPath = location.pathname;

    const isOnPublicPath = PUBLIC_PATHS.some((path) =>
      currentPath === path || currentPath.startsWith(path)
    );

    const isOnAuthSpecificPath = AUTH_SPECIFIC_PATHS.some((path) =>
      currentPath === path || currentPath.startsWith(path)
    );

    if (isLoadingAuth) {
      console.log("⏳ Still loading auth...");
      console.groupEnd();
      return;
    }

    // ------------------------------------------
    // 📌 Priority 1: Handle redirectIntent = "become-seller"
    // ------------------------------------------
    if (intent === "become-seller") {
      if (!isAuthenticated) {
        console.log("🔁 Redirecting to /auth to login for seller intent");
        navigate("/auth", { replace: true });
        console.groupEnd();
        return;
      }

      let sellerTargetPath = "/seller-apply";
      const approval = user?.seller?.approvalStatus;

      if (user?.role === "seller") {
        if (approval === "approved") sellerTargetPath = "/seller-dashboard";
        else if (approval === "pending") sellerTargetPath = "/seller-status";
      }

      if (!currentPath.startsWith(sellerTargetPath)) {
        console.log(`➡️ Redirecting to intent target: ${sellerTargetPath}`);
        navigate(sellerTargetPath, { replace: true });
      } else {
        console.log("✅ Already on correct seller page");
      }

      localStorage.removeItem("redirectIntent");
      console.groupEnd();
      return;
    }

    // ------------------------------------------
    // 🔒 Not logged in
    // ------------------------------------------
    if (!isAuthenticated) {
      if (isOnAuthSpecificPath || isOnPublicPath) {
        console.log("👤 Public or auth-specific path. No redirect needed.");
        console.groupEnd();
        return;
      }
      console.log("🚫 Restricted path. Redirecting to /auth");
      navigate("/auth", { replace: true });
      console.groupEnd();
      return;
    }

    // ------------------------------------------
    // 🔓 Logged in user
    // ------------------------------------------
    if (isOnAuthSpecificPath) {
      console.log("✅ Logged-in user on auth page. Redirecting to /");
      navigate("/", { replace: true });
      console.groupEnd();
      return;
    }

    let targetPath: string | null = null;

    switch (user?.role) {
      case "seller": {
        const approval = user.seller?.approvalStatus;
        if (approval === "approved") targetPath = "/seller-dashboard";
        else if (approval === "pending") targetPath = "/seller-status";
        else targetPath = "/seller-apply";

        if (
          !currentPath.startsWith("/seller-") &&
          !currentPath.startsWith(targetPath)
        ) {
          console.log(`🔀 Seller redirected to ${targetPath}`);
          navigate(targetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;
      }

      case "admin":
        targetPath = "/admin-dashboard";
        if (!currentPath.startsWith(targetPath)) {
          console.log("🔀 Admin redirected");
          navigate(targetPath, { replace: true });
          console.groupEnd();
          return;
        }
        break;

      case "delivery":
        targetPath = "/delivery-dashboard";
        if (!currentPath.startsWith(targetPath)) {
          console.log("🔀 Delivery redirected");
          navigate(targetPath, { replace: true });
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
          console.log("❌ Customer on restricted route, redirecting to /");
          navigate("/", { replace: true });
          console.groupEnd();
          return;
        }
    }

    console.log("✅ All clear. Staying put.");
    console.groupEnd();
  }, [
    user,
    isLoadingAuth,
    isAuthenticated,
    location.pathname,
    navigate,
    intent,
  ]);

  return null;
}
