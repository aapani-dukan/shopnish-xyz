import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // 🔴 अगर अभी लोडिंग हो रही है, तो कोई redirect नहीं करना
    if (loading) return;

    // ✅ Public pages की लिस्ट
    const publicPaths = ["/", "/product", "/cart", "/checkout"];
    const isPublic = publicPaths.some((path) => location.startsWith(path));

    if (isPublic) return;

    // 🔐 अगर user login नहीं है
    if (!user) {
      navigate("/login");
      return;
    }

    // ✅ Seller redirect
    if (user.role === "seller") {
      if (user.seller?.approvalStatus === "approved") {
        if (!location.startsWith("/seller-dashboard")) {
          navigate("/seller-dashboard");
        }
      } else {
        if (!location.startsWith("/register-seller")) {
          navigate("/register-seller");
        }
      }
      return;
    }

    // ✅ Admin redirect
    if (user.role === "admin" && !location.startsWith("/admin-dashboard")) {
      navigate("/admin-dashboard");
      return;
    }

    // ✅ Delivery redirect
    if (user.role === "delivery" && !location.startsWith("/delivery-dashboard")) {
      navigate("/delivery-dashboard");
      return;
    }

    // ✅ Default fallback
    if (!location.startsWith("/")) {
      navigate("/");
    }
  }, [user, loading, location, navigate]);

  return null;
}
