// Client/src/pages/Login.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { apiRequest } from "@/lib/queryClient"; // fetch /api/users

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle();
      const fbUser = result.user;
      if (!fbUser) return;

      // Sync with backend
      await apiRequest("POST", "/api/users", {
        firebaseUid: fbUser.uid,
        email: fbUser.email!,
        name: fbUser.displayName || fbUser.email!,
      });

      // Get token for further auth
      const token = await fbUser.getIdToken();
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      const me = await res.json();

      // Redirect based on role
      if (me.role === "seller") {
        me.approvalStatus === "approved" ? navigate("/seller-dashboard") : navigate("/seller-apply");
      } else {
        navigate("/");
      }
    } catch (e) {
      console.error("Google login error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="...">
      <Button onClick={handleGoogle} disabled={loading}>
        <GoogleIcon /> {loading ? "Signing in…" : "Continue with Google"}
      </Button>
    </div>
  );
}


