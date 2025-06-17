import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // 🧪 Debug logs
    console.log("AuthRedirectGuard → location:", location);
    console.log("AuthRedirectGuard → user:", user);

    const publicPaths = ["/", "/product", "/cart", "/checkout"];
    const isPublic = publicPaths.some((path) => location.startsWith(path));

    if (isPublic) return;

    // 🔒 User not logged in
    if (!user) {
      navigate("/login");
      return;
    }

    // ✅ Seller
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

    // ✅ Admin
    if (user.role === "admin" && !location.startsWith("/admin-dashboard")) {
      navigate("/admin-dashboard");
      return;
    }

    // ✅ Delivery
    if (user.role === "delivery" && !location.startsWith("/delivery-dashboard")) {
      navigate("/delivery-dashboard");
      return;
    }

    // ✅ Default fallback for customers
    if (!location.startsWith("/")) {
      navigate("/");
    }

  }, [user, loading]);

  return null;
}
