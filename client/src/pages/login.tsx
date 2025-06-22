// client/src/pages/login.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useLocation } from "wouter";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle();
      const fbUser = result.user;
      if (!fbUser) return;

      const token = await fbUser.getIdToken();

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseUid: fbUser.uid,
          email: fbUser.email!,
          name: fbUser.displayName || fbUser.email!,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server authentication failed: ${errorData.message || response.statusText}`);
      }

      const serverResponse = await response.json();
      console.log("Server login successful:", serverResponse);

      const user = serverResponse.user;
      if (!user) {
        throw new Error("User data not received from server.");
      }

      // 🔁 Redirect based on role and approval
      if (user.role === "seller") {
        user.approvalStatus === "approved"
          ? navigate("/seller-dashboard")
          : navigate("/seller-apply");
      } else {
        navigate("/");
      }

    } catch (e) {
      console.error("Google login error:", e);
      alert("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Button onClick={handleGoogle} disabled={loading}>
        <GoogleIcon /> {loading ? "Signing in…" : "Continue with Google"}
      </Button>
    </div>
  );
}
