// client/src/pages/auth.tsx
"use client";
import React, { useState, useEffect } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [location, navigate] = useLocation();

  // ✅ extract "next" query param (e.g., ?next=seller-apply)
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const nextPage = searchParams.get("next");

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      const result = await signInWithGoogle();
      const fbUser = result.user;
      if (!fbUser) return;

      const token = await fbUser.getIdToken();

      const res = await fetch("/api/auth/login", {
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }

      const { user: userObject } = await res.json();

      if (!userObject?.uuid || !userObject.role) {
        throw new Error("Incomplete user data from backend.");
      }

      // ✅ Role-based redirect with "next" intent preserved
      switch (userObject.role) {
        case "seller":
          if (userObject.approvalStatus === "approved") {
            navigate("/seller-dashboard");
          } else if (userObject.approvalStatus === "pending") {
            navigate("/seller-status");
          } else {
            navigate("/seller-apply");
          }
          break;

        case "admin":
          navigate("/admin-dashboard");
          break;

        case "delivery":
          navigate("/delivery-dashboard");
          break;

        case "customer":
        default:
          if (nextPage === "seller-apply") {
            navigate("/seller-apply");
          } else {
            navigate("/");
          }
          break;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      alert(`Login failed: ${err.message || "Please try again."}`);
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
              <p className="text-gray-600">Sign in to continue</p>
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
