/* client/src/pages/auth.tsx */
"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleSellerGoogleSignIn = async () => {
    try {
      setLoading(true);

      /* 1️⃣ Firebase pop-up sign-in */
      const { user: fbUser } = await signInWithGoogle();
      if (!fbUser) return;

      /* 2️⃣ Firebase ID-token */
      const token = await fbUser.getIdToken();

      /* 3️⃣ Backend auth/login – same endpoint */
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

      const { user } = await res.json();

      /* 4️⃣ Seller-specific redirect */
      if (user.role === "seller") {
        user.approvalStatus === "approved"
          ? navigate("/seller-dashboard")
          : navigate("/seller-apply");
      } else {
        // अगर seller नहीं, तो होम पर भेज दें
        navigate("/");
      }
    } catch (err) {
      console.error("Seller Google login error:", err);
      alert("Seller login failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="text-white text-2xl w-8 h-8" />
              </div>
              <h1 className="text-2xl font-semibold mb-2 text-gray-900">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to access your seller dashboard
              </p>
            </div>

            <Button
              onClick={handleSellerGoogleSignIn}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? "Signing in…" : "Continue with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
