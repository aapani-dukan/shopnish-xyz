// client/src/pages/login.tsx

import { useEffect } from "react";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Login() {
  const auth = getAuth(app);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleLoginRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result) {
          // यूजर ने Google से सफलतापूर्वक लॉगिन किया है
          console.log("🟢 Google login successful via redirect:", result.user);

          // sessionStorage से loginRole फ्लैग की जांच करें
          const loginRole = sessionStorage.getItem("loginRole");
          sessionStorage.removeItem("loginRole"); // फ्लैग का उपयोग करने के बाद हटा दें

          if (loginRole === "seller") {
            console.log("Redirecting to /register-seller based on loginRole.");
            setLocation("/register-seller");
          } else {
            console.log("Redirecting to / (Home) as no specific role was set or it was not 'seller'.");
            setLocation("/");
          }
        } else {
          // अगर कोई रीडायरेक्ट रिजल्ट नहीं है, तो यूजर शायद सीधे /login पर आया है,
          // या पहले से ही लॉग इन है (इस केस में onAuthStateChanged चलेगा).
          // अगर वे पहले से लॉग इन हैं और /login पर हैं, तो उन्हें होम पर भेजें।
          if (auth.currentUser && window.location.pathname === "/login") {
            console.log("User already logged in and on /login page. Redirecting to /.");
            setLocation("/");
          }
        }
      } catch (error) {
        console.error("🔴 Error during Google sign-in redirect result:", error);
        // एरर होने पर भी यूजर को होम पर भेज दें
        setLocation("/");
      }
    };

    handleLoginRedirect();

    // onAuthStateChanged लिसनर को हटा दें ताकि यह getRedirectResult के साथ कॉन्फ्लिक्ट न करे,
    // क्योंकि getRedirectResult ही रीडायरेक्ट लॉजिक को पूरी तरह से संभाल रहा है.
    // आपको केवल यह सुनिश्चित करने की आवश्यकता है कि `useAuth` हुक सही ढंग से
    // user.role को अपडेट कर रहा है जब Firebase claims बदलते हैं।
    return () => {}; // कोई cleanup नहीं क्योंकि हमने लिसनर हटाया है
  }, [auth, setLocation]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    // इस `handleLogin` को सीधे Header कॉम्पोनेंट में `startGoogleLogin` द्वारा कॉल किया जाना चाहिए,
    // इसलिए यहाँ sessionStorage.setItem("loginRole", "seller") की आवश्यकता नहीं है
    // जब तक आप इसे सामान्य "Continue with Google" बटन के रूप में उपयोग न करें
    // जो सेलर फ्लो शुरू नहीं करता है।
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
