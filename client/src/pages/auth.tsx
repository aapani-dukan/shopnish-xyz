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
      const fbUser = result.user;
      if (!fbUser) return;

      /* 2️⃣ Firebase ID-Token */
      const token = await fbUser.getIdToken();

      /* 3️⃣ 🔒 Backend /api/auth/login */
      const res = await fetch("/api/auth/login?role=seller", {
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

      /* 4️⃣ Server response → user object + role */
      const { user: userObject } = await res.json(); // ✅ सुनिश्चित करें कि बैकएंड 'user' कुंजी के तहत डेटा भेजता है

      // ✅ सुनिश्चित करें कि 'uuid' मौजूद है
      if (!userObject || !userObject.uuid) {
        throw new Error("User UUID missing from backend response!");
      }

      // ✅ userObject.role का उपयोग करें
      if (!userObject.role) {
        throw new Error("User role missing from backend!");
      }

      console.log("AuthPage: Backend user object received:", userObject); // डीबगिंग के लिए लॉग करें

      /* 5️⃣ Final redirect logic */
      // userObject.role और userObject.approvalStatus (यदि विक्रेता है) के आधार पर रीडायरेक्ट करें
      switch (userObject.role) {
        case "seller":
          // यदि विक्रेता स्वीकृत है, डैशबोर्ड पर जाएं
          if (userObject.approvalStatus === "approved") {
            navigate("/seller-dashboard");
          }
          // यदि विक्रेता लंबित है, स्थिति पृष्ठ पर जाएं
          else if (userObject.approvalStatus === "pending") {
            navigate("/seller-status");
          }
          // यदि विक्रेता किसी अन्य स्थिति में है (जैसे 'rejected' या 'none'), आवेदन पृष्ठ पर जाएं
          else {
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
          // ग्राहक या अन्य अप्रत्याशित भूमिकाओं के लिए डिफ़ॉल्ट होमपेज या विक्रेता आवेदन पर जाएं
          navigate("/seller-apply"); // या "/" यदि आप उन्हें होमपेज पर भेजना चाहते हैं
          break;
      }
    } catch (err: any) { // 'any' टाइप किया गया ताकि 'err.message' को एक्सेस किया जा सके
      console.error("Auth error:", err);
      alert(`Login failed: ${err.message || "Please try again."}`); // एरर मैसेज दिखाएं
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
