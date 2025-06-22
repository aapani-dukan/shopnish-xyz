/* client/src/pages/login.tsx */
"use client";

import { useState } from "react";
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

      const { user: fbUser } = await signInWithGoogle();
      if (!fbUser) return;

      const token = await fbUser.getIdToken();

      /* backend auth */
      await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseUid: fbUser.uid,
          email: fbUser.email!,
          name: fbUser.displayName || fbUser.email!,
        }),
      });

      /* सामान्य यूज़र को होम पर भेजें */
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed, please try again.");
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
