// client/src/pages/landing.tsx
import { Button } from "@/components/ui/button";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; // Firebase फंक्शन को इम्पोर्ट करें
import { useAuth } from "@/hooks/useAuth"; // useAuth इम्पोर्ट करें
import { useLocation } from "wouter"; // useLocation इम्पोर्ट करें
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // यदि उपयोगकर्ता पहले से लॉग इन है, तो उसे होम पेज पर रीडायरेक्ट करें
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log("Landing page: User already authenticated, redirecting to home.");
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleGoogleLogin = () => {
    console.log("🔵 Landing.tsx: Initiating Google Sign-in Redirect.");
    // sessionStorage.setItem("loginRole", "customer"); // यदि आप ग्राहक के लिए डिफ़ॉल्ट भूमिका चाहते हैं, तो यहां सेट करें
    initiateGoogleSignInRedirect(); // Firebase Google Sign-in Redirect शुरू करें
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome to Aap Ka Mall</h1>
        <p className="text-gray-600">Please login with Google to continue</p>

        <Button onClick={handleGoogleLogin}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
