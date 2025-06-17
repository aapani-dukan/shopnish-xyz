// src/pages/Login.tsx
"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useLocation } from "wouter";          // 🔄 wouter navigate

export default function Login() {
  const [, navigate] = useLocation();          // navigate("/path")
  const [loading, setLoading] = useState(false);

  /** Google popup-login + role-based redirect */
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // 1️⃣ Firebase popup
      const result = await signInWithGoogle();
      const firebaseUser = result.user;
      if (!firebaseUser) return;

      // 2️⃣ JWT Id-token
      const idToken = await firebaseUser.getIdToken();

      // 3️⃣ Call backend to get enriched user / role
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      const userData = await res.json();

      // 4️⃣ Role-based navigation
      if (userData.role === "seller") {
        if (userData.approvalStatus === "approved") {
          navigate("/seller-dashboard");
        } else {
          navigate("/register-seller");
        }
      } else {
        navigate("/");                         // customer / default
      }
    } catch (err) {
      console.error("❌ Google login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  /* UI */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome – Please Log In
        </h2>

        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700"
        >
          <GoogleIcon />
          {loading ? "Signing in…" : "Continue with Google"}
        </Button>
      </div>
    </div>
  );
}
