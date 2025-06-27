// client/src/pages/auth.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase"; // Firebase signInWithGoogle फ़ंक्शन
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth"; // ✅ useAuth हुक को इम्पोर्ट करें

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoadingAuth } = useAuth(); // ✅ useAuth से user, isAuthenticated, isLoadingAuth प्राप्त करें

  // यदि उपयोगकर्ता पहले से प्रमाणित है और डेटा लोड हो गया है, तो रीडायरेक्ट करें
  // यह सुनिश्चित करता है कि पृष्ठ रिफ्रेश होने पर भी उपयोगकर्ता को सही डैशबोर्ड पर भेजा जाए
  React.useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user) {
      console.log("AuthPage: User already authenticated, redirecting...");
      switch (user.role) {
        case "seller":
          if (user.approvalStatus === "approved") {
            navigate("/seller-dashboard");
          } else if (user.approvalStatus === "pending") {
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
          navigate("/");
          break;
      }
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate]);


  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      /* 1️⃣ Firebase popup/redirect */
      // यह Firebase के साथ प्रमाणीकरण प्रक्रिया शुरू करता है।
      // एक बार Firebase सफल हो जाने पर, `onAuthStateChanged` लिसनर (जो useAuth में है) ट्रिगर होगा।
      // `onAuthStateChanged` ही बैकएंड API कॉल और JWT टोकन हैंडलिंग का ध्यान रखेगा।
      await signInWithGoogle();
      // यहां हमें `result` या `fbUser` को सीधे हैंडल करने की आवश्यकता नहीं है
      // क्योंकि `useAuth` हुक में `onAuthStateChanged` लिसनर इसका ध्यान रखेगा।

      // यदि यहां कोई त्रुटि नहीं होती है, तो `onAuthStateChanged` कॉल हो जाएगा
      // और `useAuth` में `isAuthenticated` स्थिति अपडेट हो जाएगी,
      // जिसके बाद ऊपर का `useEffect` रीडायरेक्ट करेगा।

    } catch (err: any) {
      console.error("Auth error:", err);
      // यदि पॉपअप बंद कर दिया गया हो या नेटवर्क समस्या हो
      // Firebase साइन-इन प्रक्रिया में कोई भी त्रुटि यहाँ पकड़ी जाएगी
      alert(`Sign in failed: ${err.message || "Please try again."}`);
    } finally {
      setIsLoading(false); // साइन-इन प्रक्रिया समाप्त होने पर लोडिंग बंद करें
    }
  };

  // यदि प्रमाणीकरण अभी भी लोड हो रहा है, तो लोडिंग इंडिकेटर दिखाएं
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p>Loading authentication status...</p>
      </div>
    );
  }

  // यदि उपयोगकर्ता पहले से प्रमाणित है, तो यह पृष्ठ वैसे भी रीडायरेक्ट हो जाएगा,
  // इसलिए यहां अतिरिक्त UI दिखाने की कोई आवश्यकता नहीं है यदि आप हमेशा रीडायरेक्ट करना चाहते हैं।
  // अन्यथा, आप एक "आप पहले से लॉग इन हैं" संदेश दिखा सकते हैं।

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
