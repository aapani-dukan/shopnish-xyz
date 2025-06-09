// client/src/components/auth-redirect-guard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
    } else if (!user.seller) {
      navigate("/register-seller");
    } else {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return null;
}
