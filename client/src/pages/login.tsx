// client/src/pages/login.tsx
"use client";

import React, { useState } from "react";
// ✅ signInWithPopup के लिए नया फंक्शन इम्पोर्ट करें
import { signInWithGooglePopup } from "@/lib/firebase"; 
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useLocation } from "wouter"; // ✅ नेविगेशन के लिए useLocation वापस लाएं

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation(); // ✅ साइन-इन के बाद नेविगेट करने के लिए

  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // ✅ पॉप-अप फ्लो का उपयोग करें
      const userCredential = await signInWithGooglePopup();
      
      // ✅ सफल साइन-इन के बाद, उपयोगकर्ता को डैशबोर्ड या होम पेज पर भेजें
      if (userCredential.user) {
        console.log("Sign-in successful, navigating...");
        navigate("/"); // या '/dashboard'
      }

    } catch (error) {
      console.error("Google Popup Sign-In Error:", error);
      alert("Login failed. Please try again.");
    } finally {
      // ✅ पॉप-अप बंद होने के बाद यह हमेशा चलेगा
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <p className="mb-6 text-gray-600">Sign in to continue</p>
        <Button onClick={handleGoogleSignIn} disabled={loading} className="w-full">
          <GoogleIcon className="mr-2" />
          {loading ? "Signing in..." : "Login with Google"}
        </Button>
      </div>
    </div>
  );
}
