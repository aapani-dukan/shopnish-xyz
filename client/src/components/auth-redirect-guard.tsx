// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useSearch } from "wouter/use-location";

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const intent = searchParams.get("intent");
  const { user, isLoadingAuth } = useAuth();

  useEffect(() => {
    console.log("AuthRedirectGuard useEffect triggered.");
    console.log("isLoadingAuth:", isLoadingAuth);
    console.log("Current user:", user);
    console.log("Current location:", location);

    if (isLoadingAuth) {
      console.log("AuthRedirectGuard: Still loading auth, returning.");
      return;
    }

    const publicPaths = ["/", "/product", "/cart", "/checkout"];
    const isPublic = publicPaths.some((path) => location.startsWith(path));

    // 🔒 लॉगिन नहीं है
    if (!user) {
      console.log("AuthRedirectGuard: User not logged in, checking redirect.");
      if (
        !location.startsWith("/auth") &&
        !location.startsWith("/login") &&
        !location.startsWith("/admin-login")
      ) {
        console.log("AuthRedirectGuard: Redirecting to /auth.");
        navigate("/auth");
      }
      return;
    }

    // 🔓 यूज़र लॉगिन है
    if (
      location.startsWith("/auth") ||
      location.startsWith("/login") ||
      location.startsWith("/admin-login")
    ) {
      console.log(
        "AuthRedirectGuard: User is logged in and on a login/auth page, redirecting based on role."
      );
    } else if (isPublic && location === "/") {
      console.log(
        "AuthRedirectGuard: User is logged in and on a general public path, no redirect needed here."
      );
      return;
    }

    if (!user.role) {
      console.log(
        "AuthRedirectGuard: User logged in, but role is missing. Defaulting to customer dashboard."
      );
      if (!location.startsWith("/")) navigate("/");
      return;
    }

    console.log(
      "AuthRedirectGuard: User logged in, checking role-based redirect for role:",
      user.role
    );

    switch (user.role) {
      case "seller": {
        const approvalStatus = user.seller?.approvalStatus;
        let targetPath = "/seller-apply";

        if (approvalStatus === "approved") {
          targetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          targetPath = "/seller-status";
        }

        if (
          location.startsWith("/seller-apply") &&
          (approvalStatus === "approved" || approvalStatus === "pending")
        ) {
          console.log(
            `AuthRedirectGuard: Seller on /seller-apply, redirecting to ${targetPath}`
          );
          navigate(targetPath);
          return;
        }

        if (!location.startsWith(targetPath)) {
          console.log(
            `AuthRedirectGuard: Seller not on target path, redirecting to ${targetPath}`
          );
          navigate(targetPath);
        }
        return;
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
        // ✅ Allow customer to go to /seller-apply if they clicked "Become a Seller"
        if (
          intent === "become-seller" &&
          location.startsWith("/seller-apply")
        ) {
          console.log(
            "AuthRedirectGuard: Customer wants to become seller, letting them access /seller-apply"
          );
          return;
        }

        if (!location.startsWith("/")) {
          console.log("AuthRedirectGuard: Customer or unknown role, redirecting to /.");
          navigate("/");
        }
        return;
    }
  }, [user, isLoadingAuth, location, navigate]);

  return null;
}
