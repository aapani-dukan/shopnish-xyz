// client/src/pages/auth.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useLocation } from "wouter";
// import { useAuth } from "@/hooks/useAuth"; // अब सीधे उपयोग करने की आवश्यकता नहीं है यदि आप केवल signInWithGoogle का उपयोग कर रहे हैं

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  // const { user, isAuthenticated, isLoadingAuth } = useAuth(); // ✅ इन लाइनों को हटा दें

  // ✅ यह useEffect हटा दें। AuthPage का काम केवल लॉग इन करना है, न कि रीडायरेक्ट करना।
  // React.useEffect(() => {
  //   if (!isLoadingAuth && isAuthenticated && user) {
  //     console.log("AuthPage: User already authenticated, redirecting...");
  //     switch (user.role) {
  //       // ... भूमिका-आधारित रीडायरेक्ट
  //     }
  //   }
  // }, [isAuthenticated, isLoadingAuth, user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      // ✅ प्रमाणीकरण सफल होने पर, उन्हें होमपेज या पिछले पेज पर भेजें।
      // useAuth में onAuthStateChanged अब बैकएंड से टोकन और यूजर डेटा को सिंक्रनाइज़ करेगा।
      // एक बार जब useAuth में isAuthenticated true हो जाता है, तो उपयोगकर्ता लॉग इन हो जाएगा।
      navigate("/"); // या किसी डिफ़ॉल्ट पोस्ट-लॉगिन पेज पर रीडायरेक्ट करें
      
    } catch (err: any) {
      console.error("Auth error:", err);
      alert(`Sign in failed: ${err.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ यदि प्रमाणीकरण अभी भी लोड हो रहा है, तो लोडिंग इंडिकेटर दिखाएं (यह useAuth हुक में `isLoadingAuth` से आ सकता है)
  // यदि आप `useAuth` को यहाँ इम्पोर्ट नहीं कर रहे हैं, तो आप इसे इस तरह नहीं जांच सकते।
  // मान लें कि `auth.tsx` केवल अनाधिकृत उपयोगकर्ताओं के लिए है।
  // if (isLoadingAuth) { // यदि आप useAuth को वापस इम्पोर्ट करते हैं और इसे यहाँ जांचते हैं।
  //   return (
  //     <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
  //       <p>Loading authentication status...</p>
  //     </div>
  //   );
  // }

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
