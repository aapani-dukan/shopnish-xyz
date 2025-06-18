// Client/src/pages/Login.tsx
"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
// import { apiRequest } from "@/lib/apiRequest"; // अब इसकी आवश्यकता नहीं है

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle(); // Firebase से Google साइन-इन
      const fbUser = result.user;
      if (!fbUser) return;

      const token = await fbUser.getIdToken(); // Firebase से ID टोकन प्राप्त करें

      // ✅ अपने Node.js सर्वर के `/api/auth/login` एंडपॉइंट पर कॉल करें
      // यह Firebase ID टोकन को Authorization हेडर में भेजेगा।
      const response = await fetch("/api/auth/login", { // <-- यह नया रूट है जो सर्वर पर है
        method: "POST", // यह POST रिक्वेस्ट होनी चाहिए
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // टोकन को Authorization हेडर में भेजें
        },
        // आप चाहें तो बॉडी में भी कुछ बेसिक जानकारी भेज सकते हैं
        body: JSON.stringify({
          firebaseUid: fbUser.uid,
          email: fbUser.email!,
          name: fbUser.displayName || fbUser.email!,
        }),
      });

      if (!response.ok) {
        // यदि सर्वर से कोई एरर रिस्पांस आता है (जैसे 401, 500)
        const errorData = await response.json();
        throw new Error(`Server authentication failed: ${errorData.message || response.statusText}`);
      }

      const serverResponse = await response.json(); // सर्वर से JSON रिस्पांस प्राप्त करें
      console.log("Server login successful:", serverResponse);

      // सर्वर से प्राप्त यूज़र डेटा का उपयोग करें
      const user = serverResponse.user; // सुनिश्चित करें कि आपका सर्वर user ऑब्जेक्ट भेज रहा है
      if (!user) {
        throw new Error("User data not received from server.");
      }

      // रोल के आधार पर रीडायरेक्ट करें
      // सुनिश्चित करें कि आपका सर्वर `/api/auth/login` रिस्पांस में 'role' और 'approvalStatus' भेज रहा है।
      if (user.role === "seller") {
        user.approvalStatus === "approved" ? navigate("/seller-dashboard") : navigate("/seller-apply");
      } else {
        navigate("/");
      }

    } catch (e) {
      console.error("Google login error:", e);
      alert("Login failed. Please try again."); // उपयोगकर्ता को एरर मैसेज दिखाएं
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Button onClick={handleGoogle} disabled={loading}>
        <GoogleIcon /> {loading ? "Signing in…" : "Continue with Google"}
      </Button>
    </div>
  );
}
