// client/src/pages/login.tsx

import { useEffect } from "react"; // useEffect की अब आवश्यकता नहीं है अगर getRedirectResult हटा रहे हैं
import { getAuth, GoogleAuthProvider, signInWithRedirect } from "firebase/auth"; // getRedirectResult हटा दिया
import { app } from "@/lib/firebase"; 
import { Button } from "@/components/ui/button";

export default function Login() {
  const auth = getAuth(app);

  // useEffect हटा दिया गया क्योंकि getRedirectResult अब useAuth में हैंडल होगा
  // और login.tsx का काम सिर्फ लॉगिन ट्रिगर करना है।

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    sessionStorage.removeItem("loginRole"); // सामान्य लॉगिन के लिए सुनिश्चित करें कि कोई पुराना फ्लैग न हो
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
