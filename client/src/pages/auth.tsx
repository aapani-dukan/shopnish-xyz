// client/src/pages/auth.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      /* 1️⃣ Firebase popup/redirect */
      const result = await signInWithGoogle();
      const fbUser  = result.user;
      if (!fbUser) return;

      /* 2️⃣  Firebase ID-Token */
      const token   = await fbUser.getIdToken();

      /* 3️⃣  🔒  Backend /api/auth/login (या जो भी path है) */
      const res = await fetch("/api/auth/login", {
        method : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization : `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseUid: fbUser.uid,
          email      : fbUser.email!,
          name       : fbUser.displayName || fbUser.email!,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }

      /* 4️⃣  Server response → user object + role */
      const { user } = await res.json();          // { id, role, approvalStatus, ... }
      if (!user || !user.role) throw new Error("User role missing from backend!");

      /* 5️⃣  Final redirect logic */
      switch (user.role) {
        case "seller":            // ✅ Approved seller
          navigate("/seller-dashboard");
          break;

        case "pending_seller":    // 🕗 Awaiting approval
          navigate("/seller-pending");            // ← अपना पेज/Toast जो चाहें
          break;

        default:                  // "user" या कुछ भी
          navigate("/seller-apply");
      }

    } catch (err) {
      console.error("Auth error:", err);
      alert("Login failed, please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to continue
              </p>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? "Signing in…" : "Continue with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
