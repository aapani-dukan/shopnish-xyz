// client/src/pages/auth.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useLocation } from "wouter"; // useLocation इम्पोर्ट करें

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [location, navigate] = useLocation(); // ✅ location भी प्राप्त करें

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();

      // ✅ पिछले URL को चेक करें (यदि उपलब्ध हो)
      // Wouter के साथ, यदि आप सीधे किसी URL पर नहीं गए हैं,
      // तो 'location.search' में रीडायरेक्ट पैरामीटर हो सकता है।
      // एक अधिक मजबूत समाधान एक 'redirect_to' क्वेरी पैरामीटर होगा
      // जिसे आप लॉगिन पेज पर जाने से पहले जोड़ सकते हैं।
      
      // एक सरल समाधान के रूप में, लॉगिन के बाद डिफ़ॉल्ट रूप से होम पर जाएं
      // और उम्मीद करें कि seller-apply पेज यदि आवश्यक हो तो रीडायरेक्ट करेगा।
      // लेकिन यदि आप चाहते हैं कि वे वापस seller-apply पर जाएं, तो आपको URL में इसे भेजना होगा।

      // एक अधिक उन्नत तरीका:
      // यदि आप `seller-apply` से `/auth?redirect_to=/seller-apply` पर रीडायरेक्ट करते हैं,
      // तो आप इसे `location.search` से पार्स कर सकते हैं।
      const params = new URLSearchParams(location.search);
      const redirectTo = params.get("redirect_to") || "/"; // डिफ़ॉल्ट रूप से होम

      navigate(redirectTo); // ✅ उपयोगकर्ता को पिछले पेज या होम पर रीडायरेक्ट करें
      
    } catch (err: any) {
      console.error("Auth error:", err);
      alert(`Sign in failed: ${err.message || "Please try again."}`);
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
