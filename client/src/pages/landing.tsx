"use client";

import { signInWithGoogle } from "@/lib/firebase"; // popup वाला function import करें
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();

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

        // 🔀 रीडायरेक्शन लॉजिक यूज़र के role/status के हिसाब से करें
        if (userData.role === "seller") {
          if (userData.approvalStatus === "approved") {
            router.push("/seller-dashboard");
          } else {
            router.push("/register-seller");
          }
        } else {
          router.push("/"); // General customer
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
