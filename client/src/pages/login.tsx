"use client";
import React, { useState } from "react";
import { signInWithGooglePopup } from "@/lib/firebase"; // ✅ Popup login function
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleGoogle = async () => {
    try {
      setLoading(true);

      const userCredential = await signInWithGooglePopup();
      console.log("User logged in:", userCredential.user);

      // Optional: Navigate after login
      navigate("/");

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
