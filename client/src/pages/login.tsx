"use client";
import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
// import { apiRequest } from "@/lib/apiRequest"; // अब इसकी आवश्यकता नहीं हो सकती है अगर आप इसे सीधे उपयोग नहीं कर रहे हैं
// या इसे हटा दें यदि `/api/users` रूट को हटा दिया गया है
// आप चाहें तो इसे अन्य API कॉल्स के लिए रख सकते हैं, लेकिन यहाँ से हटा दें।


export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle(); // Firebase से Google साइन-इन
      const fbUser = result.user;
      if (!fbUser) return;

      // Firebase से ID टोकन प्राप्त करें
      const token = await fbUser.getIdToken();

      // ✅ अपने Node.js सर्वर के `/api/auth/login` एंडपॉइंट पर कॉल करें
      // यह Firebase ID टोकन को भेजेगा और सर्वर पर यूज़र को सिंक करेगा/जानकारी प्राप्त करेगा।
      const response = await fetch("/api/auth/login", { // <-- यहाँ हमने /api/auth/login का उपयोग किया
        method: "POST", // यह एक POST रिक्वेस्ट होनी चाहिए
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Authorization हेडर में टोकन भेजें
        },
        // यदि सर्वर-साइड /api/auth/login को Firebase UID, email, name की आवश्यकता है
        // तो आप उन्हें body में भी भेज सकते हैं, हालांकि verifyToken मिडिलवेयर उन्हें token से भी प्राप्त कर सकता है।
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

      // सर्वर से प्राप्त यूज़र डेटा का उपयोग करें (जो `routes.ts` में भेजा गया है)
      const user = serverResponse.user; // सुनिश्चित करें कि आपका सर्वर user ऑब्जेक्ट भेज रहा है
      if (!user) {
        throw new Error("User data not received from server.");
      }

      // Redirect based on role (यदि आपके सर्वर रिस्पांस में role और approvalStatus हैं)
      // आपको यह सुनिश्चित करना होगा कि serverResponse.user में role और approvalStatus मौजूद हों।
      if (user.role === "seller") {
        user.approvalStatus === "approved" ? navigate("/seller-dashboard") : navigate("/seller-apply");
      } else {
        navigate("/");
      }

    } catch (e) {
      console.error("Google login error:", e);
      // उपयोगकर्ता को एक मित्रवत त्रुटि संदेश दिखाएं
      alert("Login failed. Please try again.");
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
