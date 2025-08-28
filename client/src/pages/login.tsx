// client/src/pages/login.tsx
"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGooglePopup } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const userCredential = await signInWithGooglePopup();
      
      if (userCredential.user) {
        const idToken = await userCredential.user.getIdToken();

        // ✅ Backend API को कॉल करें और उपयोगकर्ता डेटा को प्राप्त करें
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
          throw new Error('Backend login failed.');
        }

        const data = await response.json();
        console.log("Backend login successful:", data.message);

        // ✅ अब, उपयोगकर्ता का डेटा `data.user` में है
        console.log("Logged-in User Data:", data.user);

        // ✅ Backend से सफल प्रतिक्रिया मिलने के बाद ही नेविगेट करें
        navigate("/");
      }

    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Login failed. Please try again.");
    } finally {
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
