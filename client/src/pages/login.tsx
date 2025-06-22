// client/src/pages/login.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleGoogle = async () => {
    try {
      setLoading(true);

      const { user: fbUser } = await signInWithGoogle();
      if (!fbUser) return;

      // अगर backend पर customer बनाना हो तो यहाँ minimal POST कर दें
      navigate("/");  // सीधे होम पर
    } catch (err) {
      console.error("Customer login error:", err);
      alert("Login failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Button onClick={handleGoogle} disabled={loading}>
        <GoogleIcon /> {loading ? "Signing in…" : "Login with Google"}
      </Button>
    </div>
  );
}
