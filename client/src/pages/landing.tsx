"use client";

import { signInWithGoogle } from "@/lib/firebase";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;

      if (user) {
        const idToken = await user.getIdToken();

        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        const userData = await response.json();

        if (userData.role === "seller") {
          if (userData.approvalStatus === "approved") {
            navigate("/seller-dashboard");
          } else {
            navigate("/register-seller");
          }
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Button onClick={handleGoogleLogin}>Login with Google</Button>
    </div>
  );
}
