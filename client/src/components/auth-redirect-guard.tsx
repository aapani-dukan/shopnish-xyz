// client/src/components/auth-redirect-guard.tsx
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // ✅ Allow these public routes without redirect
    const publicPaths = ["/", "/product", "/cart", "/checkout"];
    const isPublic = publicPaths.some((path) =>
      location.startsWith(path)
    );

    if (isPublic) return;

    // 🔒 Redirect based on auth status
    if (!user) {
      navigate("/login");
    } else if (!user.seller) {
      navigate("/register-seller");
    }
    // 👉 Already logged-in seller will stay wherever they are
  }, [user, loading, location, navigate]);

  return null;
}
