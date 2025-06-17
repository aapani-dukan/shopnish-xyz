import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

/**
 * Centralised route-guard.
 * –  Public paths बिना login के एक्सेस हो सकते हैं
 * –  बाक़ी paths user-role के आधार पर redirect होते हैं
 */
export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;                               // ⏳ Firebase अभी भी verify कर रहा है

    // 👉 dev-debug
    console.log("[Guard] location:", location);
    console.log("[Guard] user:", user);

    /* ─────────────────────────────  PUBLIC  ───────────────────────────── */
    const publicPaths = ["/", "/product", "/cart", "/checkout"];
    const isPublic = publicPaths.some(path => location.startsWith(path));
    if (isPublic) return;

    /* ───────────────────────────  NOT LOGGED IN  ─────────────────────── */
    if (!user) {
      if (!location.startsWith("/login")) navigate("/login");
      return;
    }

    /* ───────────────────────────   ROLE BASED   ──────────────────────── */
    switch (user.role) {
      /* ---------- Seller ---------- */
      case "seller": {
        const approved = user.seller?.approvalStatus === "approved";
        const target   = approved ? "/seller-dashboard" : "/register-seller";
        if (!location.startsWith(target)) navigate(target);
        return;
      }

      /* ---------- Admin ---------- */
      case "admin":
        if (!location.startsWith("/admin-dashboard"))
          navigate("/admin-dashboard");
        return;

      /* ---------- Delivery ---------- */
      case "delivery":
        if (!location.startsWith("/delivery-dashboard"))
          navigate("/delivery-dashboard");
        return;

      /* ---------- Customer / fallback ---------- */
      default:
        if (!location.startsWith("/")) navigate("/");
    }
  }, [user, loading, location, navigate]);   // ← location & navigate अब dependency list में

  return null;                               // गार्ड कोई UI रेंडर नहीं करता
}
