// client/src/pages/login.tsx (संशोधित)

import { useEffect } from "react";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
// import { useLocation } from "wouter"; // useLocation की अब यहाँ आवश्यकता नहीं है

export default function Login() {
  const auth = getAuth(app);
  // const [, setLocation] = useLocation(); // अब इसकी आवश्यकता नहीं है

  useEffect(() => {
    // getRedirectResult को सिर्फ यह चेक करने दें कि लॉगिन सफल हुआ है या नहीं,
    // रीडायरेक्शन अब AuthRedirectGuard द्वारा संभाला जाएगा.
    // user.role या sessionStorage.loginRole के आधार पर यहाँ कोई सेटLocation नहीं होगा।
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("🟢 Google login successful via redirect. AuthGuard will handle redirection.");
        } else {
          // अगर यूजर सीधे /login पर आया है और पहले से लॉग इन है, तो AuthGuard उसे सही जगह भेजेगा।
          // यहाँ कोई डायरेक्ट रीडायरेक्ट नहीं।
        }
      })
      .catch((error) => {
        console.error("🔴 Error during Google sign-in redirect result:", error);
        // एरर होने पर भी, AuthGuard यूजर के ऑथेंटिकेशन स्टेटस के आधार पर संभालेगा।
      });

    // onAuthStateChanged लिसनर की भी अब यहाँ आवश्यकता नहीं है,
    // क्योंकि AuthGuard और useAuth hook इसे संभाल रहे हैं।
    return () => {};
  }, [auth]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    sessionStorage.removeItem("loginRole"); // सुनिश्चित करें कि कोई पुराना फ्लैग न हो
    signInWithRedirect(auth, provider);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome to Shopnish</h1>
        <p className="text-gray-600">Please login with Google to continue</p>

        <Button onClick={handleLogin}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
