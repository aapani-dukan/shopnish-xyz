// client/src/pages/login.tsx

import { useEffect } from "react";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { app } from "@/lib/firebase"; // सुनिश्चित करें कि Firebase ऐप यहाँ सही से इम्पोर्ट हुआ है
import { Button } from "@/components/ui/button";

export default function Login() {
  const auth = getAuth(app);

  useEffect(() => {
    // Google से रीडायरेक्ट होने के बाद, यह कोड चलता है।
    // हम यहां कोई डायरेक्ट नेविगेशन नहीं करेंगे, क्योंकि AuthRedirectGuard इसे संभालेगा।
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("🟢 login.tsx: Google login successful via redirect. User:", result.user.uid);
          // इस बिंदु पर, AuthRedirectGuard एक्टिवेट हो जाएगा और यूजर को सही पेज पर भेज देगा।
          // sessionStorage.loginRole को यहीं हटाने की जरूरत नहीं है, AuthRedirectGuard उसे संभालेगा।
        } else {
          console.log("🟡 login.tsx: No redirect result user found, or not a redirect flow.");
          // यदि यूजर सीधे /login पर आया है या पहले से लॉग इन है, तो भी
          // AuthRedirectGuard उसे उसकी ऑथेंटिकेशन स्थिति के आधार पर संभालेगा।
        }
      } catch (error) {
        console.error("🔴 login.tsx: Error during Google sign-in redirect result:", error);
        // एरर होने पर भी, AuthRedirectGuard यूजर के ऑथेंटिकेशन स्टेटस के आधार पर संभालेगा।
      }
    };

    handleRedirectResult();

    // कोई onAuthStateChanged लिसनर यहाँ नहीं चाहिए, useAuth हुक इसे संभालता है।
    return () => {}; 
  }, [auth]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    // यदि यह सामान्य लॉगिन बटन है, तो loginRole नहीं सेट करें.
    // यदि "Become a Seller" बटन इसे कॉल कर रहा है, तो उसने पहले ही sessionStorage सेट कर दिया होगा.
    sessionStorage.removeItem("loginRole"); // सुनिश्चित करें कि कोई पुराना, अवांछित फ्लैग न हो.
    console.log("🔵 login.tsx: Initiating Google sign-in redirect.");
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
