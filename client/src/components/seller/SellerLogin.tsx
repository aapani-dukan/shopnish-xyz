// components/seller/SellerLogin.tsx

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/firebase";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChange } from "@/lib/firebase";

export default function SellerLogin() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;

      // Optional: आप backend को भी user token भेज सकते हैं यहाँ
      console.log("Logged in user:", user);
      navigate("/seller/dashboard"); // या जहाँ ले जाना हो
    } catch (error) {
      console.error("Login failed:", error);
      alert("Google login failed. Please try again.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        navigate("/seller/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        Please login with your Google account to continue.
      </p>
      <Button onClick={handleLogin} className="w-full">
        Login with Google
      </Button>
    </div>
  );
}
