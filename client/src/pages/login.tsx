// client/src/pages/login.tsx

import { Button } from "@/components/ui/button";
import { signInWithGooglePopup } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGooglePopup();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <Button onClick={handleLogin}>Login with Google</Button>
    </div>
  );
}
