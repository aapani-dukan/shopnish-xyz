// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

/**
 * Centralized route-guard
 * - Allows access to public pages without login
 * - Redirects to appropriate dashboard based on user role
 */
export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const publicPaths = ["/", "/product", "/cart", "/checkout"];
    const isPublic = publicPaths.some((path) => location.startsWith(path));
    if (isPublic) return;

    // 🚫 Not logged in → redirect to login page
    if (!user) {
      if (!location.startsWith("/login")) {
        navigate("/login");
      }
      return;
    }

    // ✅ Logged in → Role-based redirect
    switch (user.role) {
      case "seller": {
        const approved = user.seller?.approvalStatus === "approved";
        const target = approved ? "/seller-dashboard" : "/register-seller";
        if (!location.startsWith(target)) navigate(target);
        return;
      }

      case "admin":
        if (!location.startsWith("/admin-dashboard")) {
          navigate("/admin-dashboard");
        }
        return;

      case "delivery":
        if (!location.startsWith("/delivery-dashboard")) {
          navigate("/delivery-dashboard");
        }
        return;

      case "customer":
      default:
        if (!location.startsWith("/")) navigate("/");
    }
  }, [user, loading, location, navigate]);

  return null; // No UI – just logic
}
